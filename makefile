all: clue.js

ECS_FILES = $(wildcard ecs/*.ecs)

CSV_FILES = $(wildcard ecs/getaclue/*.csv)

GAME_ECS_FILES = $(wildcard ecs/getaclue/*.ecs)

clue.js: $(ECS_FILES) $(CSV_FILES) $(GAME_ECS_FILES)
	rm -f $@
	python ecsCompiler/compileEcs.py ecs/getaclue templates $@
