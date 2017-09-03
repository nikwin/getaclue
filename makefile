all: clue.js

ECS_FILES = $(wildcard ecs/*.ecs)

clue.js: $(ECS_FILES)
	rm -f $@
	python ecsCompiler/compileEcs.py ecs/game templates $@
