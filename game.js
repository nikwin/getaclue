var PARAMETERS = {
    "startEntities": [
        "person1"
    ]
};

var allArgs = {};

var ecs = {
    person: function(args){
        return {
            identityComponent: ecs.identityComponent(args),
            personComponent: ecs.personComponent(args)
        };
    },
    identityComponent: function(args){
        if (args.key === undefined){ throw "ECS fail " + args.key + " missing key"; }
        if (args.name === undefined){ throw "ECS fail " + args.key + " missing name"; }
        return {
            name: args['name'],
            key: args['key']
        };
    },
    personComponent: function(args){
        return {
            cardInferences: args['{}'],
            cardsHeld: []
        };
    }
};



var csvIdentifiers = {}

var findKeyFor = function(csvId, key, val){
    return _.chain(csvIdentifiers[csvId])
    .filter(function(argKey){
        return (allArgs[argKey][key] == val);
    })
    .first()
    .value();
};

var updateArgs = function(args, defaultArgs){
    _.each(defaultArgs, function(val, key){
        args[key] = val;
    });
};

var uidManager = (function(){
    var uid = 0;
    return {
        getUid: function(){
            uid += 1;
            return uid;
        },
        setUid: function(newUid){
            uid = newUid;
        }
    };
})();

var makeEcs = function(key, args){
    if (ecs[key] === undefined){
        console.log('tried to build ' + key);
    }

    args = (args === undefined) ? {} : args;
    if (!args.uid){
        args.uid = uidManager.getUid();
    }
    
    var passedArgs = _.clone(args);
    
    var newEcs = ecs[key](args);
    
    newEcs.key = key;
    newEcs.passedArgs = passedArgs;
    newEcs.uid = args.uid;

    return newEcs;
};

var makeAllEcs = function(csvId){
    return _.map(csvIdentifiers[csvId], function(key){
        return makeEcs(key, {});
    });
};
