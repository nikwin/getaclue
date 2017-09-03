all: clue.js

ECS_FILES = $(wildcard ecs/*.ecs)

CSV_FILES = $(wildcard ecs/game/*.csv)

GAME_ECS_FILES = $(wildcard ecs/game/*.ecs)

clue.js: $(ECS_FILES) $(CSV_FILES) $(GAME_ECS_FILES)
	rm -f $@
	python ecsCompiler/compileEcs.py ecs/game templates $@
