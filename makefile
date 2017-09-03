all: game.js

ECS_FILES = $(wildcard ecs/*.ecs)

game.js: $(ECS_FILES)
	rm -f $@
	python ecsCompiler/compileEcs.py ecs/game templates $@
