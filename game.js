var rendererSystem = function(game, entities){
    var renderers = _.map(_.range(25), () => []);

    _.each(entities, (entity) => {
        _.each(entity.renderComponents, (renderComponent) => {
            renderers[renderComponent].push({
                render: renderComponent.render,
                entity: entity,
                rect: renderComponent.getRect(entity)
            });
        });
    });

    _.each(renderers, (renderGroup) => {
        renderGroup.render(game, renderGroup.entity, renderGroup.rect);
    });
};

var Game = function(gameProperties){
    this.gameProperties = gameProperties;
};

Game.prototype.initialize = function(){
    this.entities = _.map(PARAMETERS.startEntities, key => makeEcs(key));
    _.each(PARAMETERS.startEntityGroups, (group) => {
        this.entities = this.entities.concat(makeAllEcs(group));
    });
};

Game.prototype.draw = function(){
    rendererSystem(this, this.entities);
};

Game.prototype.update = function(){
    return true;
};

var getGame = function(gameProperties){
    return new Game(gameProperties);
};

var GameProperties =function(){
    this.next = null;
};
