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

    if (result){
        
    }
    else if (answer){
        result = answer.answerComponent.tryAnswer(question, game);
        if (result){
            answer.healthComponent.kill();

            var answerKey = person.personComponent.getInformAnswer();
            game.makeEntities(person, answerKey, {
                result: result,
                showingId: answer.answerComponent.personId,
                personId: person.uid,
                questionText: question.questionComponent.makeQuestionStatement(game)
            });
            
            if (result.success || question.questionComponent.offset == people.length){
                question.healthComponent.kill();
                turnCounter.turnCounterComponent.turnCount += 1;
                turnCounter.turnCounterComponent.turnCount %= people.length;
                
                if (result.success){
                    person.personComponent.cardsSeen.push(result.card);
                }
            }
            
        }
    }
    else if (question){
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
    else if (questionMaker){
        question = questionMaker.questionMakingComponent.makeQuestion(questionMaker, game, person);
        if (question){
            questionMaker.healthComponent.kill();
        }
    }
    else{
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

    var sortedCards = _.groupBy(cards, card => card.cardComponent.category);
    var personIndex = 0;
    
    _.each(sortedCards, (cards) => {
        _.each(cards, (card) => {
            people[personIndex].personComponent.cardsHeld.push(card.key);
            personIndex += 1;
            personIndex %= people.length;
        });
    });
    
    bindHandler.bindFunction(this.getTouchFunction());
};

Game.prototype.draw = function(){
    ctx.fillStyle = '#aaaaaa';
    ctx.fillRect(0, 0, width, height);
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

var getGame = function(gameProperties){
    return new Game(gameProperties);
};

var GameProperties =function(){
    this.next = null;
};
