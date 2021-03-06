var getFont = function(size){ return '' + size + 'px IndieFlower'; };

var BASE_FONT = getFont(12);
ctx.font = BASE_FONT;

var rendererSystem = function(game, entities){
    var renderers = _.map(_.range(25), () => []);

    _.each(entities, (entity) => {
        _.each(entity.renderComponents, (renderComponent) => {
            renderers[renderComponent.priority].push({
                renderComponent: renderComponent,
                entity: entity,
                rect: renderComponent.getRect(entity)
            });
        });
    });

    _.each(renderers, (renderSet) => {
        _.each(renderSet, (renderGroup) => {
        renderGroup.renderComponent.render(game, renderGroup.entity, renderGroup.rect);
        });
    });
};

var actionSystem = function(game, entities){
    var people = _.filter(entities, entity => entity.personComponent);
    var answer = _.filter(entities, entity => entity.answerComponent)[0];
    var question = _.filter(entities, entity => entity.questionComponent)[0];
    var questionMaker = _.filter(entities, entity => entity.questionMakingComponent)[0];
    var turnCounter = _.filter(entities, entity => entity.turnCounterComponent)[0];
    var person = people[turnCounter.turnCounterComponent.turnCount];
    var result = _.filter(entities, entity => entity.resultComponent)[0];

    var tickTurn = function(){
        turnCounter.turnCounterComponent.turnCount += 1;
        turnCounter.turnCounterComponent.turnCount %= people.length;
    };

    if (result){
        
    }
    else if (answer){
        result = answer.answerComponent.tryAnswer(question, game);
        if (result){
            answer.healthComponent.kill();

            var answerKey = person.personComponent.getInformAnswer();

            if (!answer.answerComponent.skipResult){
                game.makeEntities(person, answerKey, {
                    result: result,
                    showingId: answer.answerComponent.personId,
                    personId: person.uid,
                    questionText: question.questionComponent.makeQuestionStatement(game)
                });
            }
                        
            if (result.success || question.questionComponent.offset == people.length){
                question.healthComponent.kill();
                tickTurn();
                
                if (result.success){
                    person.personComponent.cardsSeen.push(result.card);
                }
            }
            
        }
    }
    else if (question){
        if (question.questionComponent.isGuess){
            var guessChecker = _.filter(entities, entity => entity.guessCheckerComponent)[0];
            if (guessChecker.guessCheckerComponent.checkGuess(question)){
                game.makeEntities(person, PARAMETERS.endGame, {
                    playerWin: person.personComponent.isPlayer,
                    personName: person.identityComponent.name,
                    cards: guessChecker.guessCheckerComponent.cards
                });
            }
            else{
                if (person.personComponent.isPlayer){
                    var randomName = _.chain(people)
                            .filter(person => !person.personComponent.isPlayer)
                            .sample()
                            .value().identityComponent.name;
                    
                    game.makeEntities(person, PARAMETERS.endGame, {
                        playerWin: false,
                        personName: randomName,
                        cards: guessChecker.guessCheckerComponent.cards
                    });
                }
                else{
                    game.makeEntities(person, guessChecker.guessCheckerComponent.failResult, {
                        personName: person.identityComponent.name
                    });
                    person.personComponent.canAskQuestions = false;
                }
            }
        }
        else{
            var personIndex = turnCounter.turnCounterComponent.turnCount + question.questionComponent.offset;
            personIndex %= people.length;

            var answeringPerson = people[personIndex];
            game.makeEntities(answeringPerson, answeringPerson.personComponent.getAnswer(), {
                personId: answeringPerson.uid,
                askingId: person.uid,
                cardsChosen: question.questionComponent.cardsChosen
            });
            question.questionComponent.offset += 1;
        }
    }
    else if (questionMaker){
        question = questionMaker.questionMakingComponent.makeQuestion(questionMaker, game, person);
        if (question){
            questionMaker.healthComponent.kill();
        }
    }
    else{
        while (!person.personComponent.canAskQuestions){
            tickTurn();
            person = people[turnCounter.turnCounterComponent.turnCount];
        }
        
        game.makeEntities(person, person.personComponent.getQuestionMaker());
    }
};

var intervalSystem = function(game, entities, interval){
    _.chain(entities)
        .filter(entity => entity.intervalComponent)
        .each(entity => entity.intervalComponent.updateInterval(entity, game, interval));
};

var healthSystem = function(game, entities){
    game.entities = _.filter(entities, entity => (!entity.healthComponent || entity.healthComponent.health > 0));
};

var Game = function(gameProperties){
    this.gameProperties = gameProperties;
};

Game.prototype.initialize = function(){
    this.entities = _.map(PARAMETERS.startEntities, key => makeEcs(key));
    _.each(PARAMETERS.startEntityGroups, (group) => {
        this.entities = this.entities.concat(makeAllEcs(group));
    });

    var cards = _.filter(this.entities, entity => entity.cardComponent);
    var people = _.filter(this.entities, entity => entity.personComponent);

    people[0].personComponent.isPlayer = true;

    var sortedCards = _.chain(cards)
            .shuffle()
            .groupBy(card => card.cardComponent.category)
            .value();


    var personIndex = 0;
    
    var answerCards = {};

    _.each(sortedCards, (cards, category) => {
        _.each(cards, (card, i) => {
            if (i === 0){
                answerCards[category] = card.identityComponent.key;
            }
            else{
                people[personIndex].personComponent.cardsHeld.push(card.identityComponent.key);
                personIndex += 1;
                personIndex %= people.length;
            }
        });
    });

    this.entities.push(makeEcs(PARAMETERS.guessChecker, {cards: answerCards}));
        
    bindHandler.bindFunction(this.getTouchFunction());
};

Game.prototype.draw = function(){
    ctx.drawImage(getImage('back'), 0, 0);
    rendererSystem(this, this.entities);
};

Game.prototype.update = function(interval){
    actionSystem(this, this.entities);
    intervalSystem(this, this.entities, interval);
    healthSystem(this, this.entities);
    return true;
};

Game.prototype.makeEntities = function(source, entitiesToMake, specificArgs){
    var args = {};

    _.each(specificArgs, function(val, key){
        args[key] = val;
    });

    var entitiesMade = [];

    var that = this;

    var mkEntity = function(entitiesToMake, args){
        if (!entitiesToMake){
            return;
        }
        if (_.isString(entitiesToMake)){
            args = _.clone(args);
            var entityMade = makeEcs(entitiesToMake, args);

            if (entityMade.replaceMarker){
                args.uid = undefined;
                entitiesToMake = entityMade.replaceMarker.getReplaceKeys(entityMade, that, args);
                mkEntity(entitiesToMake, args);
            }
            else{
                that.addEntity(entityMade);
                entitiesMade.push(entityMade);
            }
        }
        else if (_.isArray(entitiesToMake)){
            _.each(entitiesToMake, entity => mkEntity(entity, args));
        }
        else{
            _.each(entitiesToMake, function(val, key){
                if (Math.random() * 100 < val){
                    mkEntity(key, args);
                }
            });
        }
    };
    
    mkEntity(entitiesToMake, args);
    
    return entitiesMade;
};

Game.prototype.addEntity = function(entity){
    this.entities.push(entity);
};

Game.prototype.entityForKey = function(key){
    return _.filter(this.entities, entity => (entity.identityComponent && entity.identityComponent.key == key))[0];
};

Game.prototype.entityForUid = function(uid){
    return _.filter(this.entities, entity => (entity.uid == uid))[0];
};

Game.prototype.getTouchFunction = function(){
    var that = this;
    return function(e){
        e.preventDefault();
        
        var pos = getPos(e);
        that.lastPos = pos;
        
        _.chain(that.entities)
            .filter(entity => entity.touchHandleComponent)
            .each(entity => entity.touchHandleComponent.handleTouch(entity, that, pos));
                
        return false;
    };
};

Game.prototype.getPlayer = function(){
    return _.filter(this.entities, entity => entity.personComponent && entity.personComponent.isPlayer)[0];
};

var StartScreen = function(gameProperties){
    this.gameProperties = gameProperties;
    this.gameProperties.next = new Game(this.gameProperties);
};

StartScreen.prototype.initialize = function(){
    this.running = true;
    bindHandler.bindFunction(this.getTouchFunction());
};

StartScreen.prototype.draw = function(){
    ctx.drawImage(getImage('back'), 0, 0);
    
    ctx.fillStyle = '#eeeeee';
    ctx.fillRect(width / 5 - 20, 75, 3 * width / 5 + 40, 2 * height / 3);
    
    ctx.font = getFont(20);

    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    var lines = [
        "Your entire class just got called in for a special lecture.",
        "So, now you know that two people were caught somewhere in this school.",
        "And given the talk, you know their genders.",
        "Now, you and your group need to find out who it was.",
        "But you need to find out first! You can't let anyone else break that gossip!",
        "So, it's time to pool your knowledge and",
    ];
    _.each(lines, (line, i) => {
        ctx.fillText(line, width / 2, 120 + 50 * i);
    });

    ctx.font = getFont(40);
    this.continueRect = [width / 2 - 200, height / 2 + 50, 400, 100];
    ctxRoundedRect(this.continueRect);
    ctx.fillText('GET A CLUE!', width / 2, height / 2 + 120);
    ctx.font = BASE_FONT;
};

StartScreen.prototype.update = function(){
    return this.running;
};

StartScreen.prototype.getTouchFunction = function(){
    var that = this;
    return function(e){
        e.preventDefault();

        var pos = getPos(e);
        if (containsPos(that.continueRect, pos)){
            that.running = false;
        }
    };
};

var getGame = function(gameProperties){
    return new StartScreen(gameProperties);
};

var GameProperties =function(){
    this.next = null;
    
    this.settings = localStorage.settings;

    if (this.settings){
        this.settings = JSON.parse(this.settings);
    }
    else{
        this.settings = {
            music: false
        };
    }

    this.backgroundAudio = new Audio('sounds/pianofantasia-no-1-intervention.mp3');
    this.backgroundAudio.loop = true;
    this.backgroundAudio.volume = .1;
    this.backgroundAudio.load();
    
    if (this.settings.music){
        this.backgroundAudio.play();
    }
};

GameProperties.prototype.save = function(){
    localStorage.settings = JSON.stringify(this.settings);
};
