var Game = function(gameProperties){
    this.gameProperties = gameProperties;
};

Game.prototype.initialize = function(){

};

Game.prototype.draw = function(){

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
