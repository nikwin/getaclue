all: clue.js

ECS_FILES = $(wildcard ecs/*.ecs)

CSV_FILES = $(wildcard ecs/game/*.csv)

clue.js: $(ECS_FILES) $(CSV_FILES)
	rm -f $@
	python ecsCompiler/compileEcs.py ecs/game templates $@
