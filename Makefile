# RetroTV convenience commands. Usage: make <target>
COMPOSE = docker compose

.PHONY: help setup up down build logs assets emu-restart emu-logs cms-restart db backup reset

help:
	@echo "RetroTV targets:"
	@echo "  make setup       - fetch the nitro submodule(s) + fix line endings + create .env"
	@echo "  make up          - build + start the whole stack (detached)"
	@echo "  make down        - stop the stack"
	@echo "  make logs        - follow emulator + nitro + cms logs"
	@echo "  make assets      - generate/convert the Nitro client assets (run once)"
	@echo "  make emu-restart - restart the emulator"
	@echo "  make emu-logs    - follow the emulator log"
	@echo "  make cms-restart - rebuild + restart the CMS"
	@echo "  make db          - open a database shell"
	@echo "  make backup      - dump the database to backup-<date>.sql"
	@echo "  make reset       - DESTROY volumes and rebuild from scratch"

setup:
	bash scripts/setup.sh

up:
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down

build:
	$(COMPOSE) build

logs:
	$(COMPOSE) logs -f arcturus nitro cms

assets:
	docker exec retrotv-nitro bash -c "cp /app/configuration/nitro-converter/configuration.json /app/nitro-converter/configuration.json"
	docker exec retrotv-nitro bash -c "cd /app/nitro-converter; yarn ts-node-dev --transpile-only src/Main.ts"
	docker exec retrotv-nitro bash -c "rsync -r /app/nitro-converter/assets/* /app/nitro-assets/"
	@echo "Assets generated. Hard-refresh the client."

emu-restart:
	$(COMPOSE) restart arcturus

emu-logs:
	docker logs -f retrotv-arcturus

cms-restart:
	$(COMPOSE) up -d --build cms

db:
	docker exec -it retrotv-mysql mariadb -u arcturus_user -parcturus_pw habbo

backup:
	docker exec retrotv-mysql mariadb-dump -u root -parcturus_root_pw habbo > backup-$$(date +%F).sql
	@echo "Wrote backup-$$(date +%F).sql"

reset:
	$(COMPOSE) down -v
	$(COMPOSE) up -d --build
