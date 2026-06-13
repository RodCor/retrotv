# RetroTV convenience commands. Usage: make <target>
COMPOSE = docker compose

.PHONY: help setup up down build logs assets emu-restart cms-restart mysql backup reset

help:
	@echo "RetroTV targets:"
	@echo "  make setup       - fetch engine submodules + fix line endings + create .env"
	@echo "  make up          - build + start the whole stack (detached)"
	@echo "  make down        - stop the stack"
	@echo "  make logs        - follow emulator + nitro + cms logs"
	@echo "  make assets      - generate/convert the Nitro client assets (run once)"
	@echo "  make emu-restart - restart the emulator"
	@echo "  make cms-restart - rebuild + restart the CMS"
	@echo "  make mysql       - open a MySQL shell"
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

cms-restart:
	$(COMPOSE) up -d --build cms

mysql:
	docker exec -it retrotv-mysql mysql -u arcturus_user -parcturus_pw arcturus

backup:
	docker exec retrotv-mysql mysqldump -u root -parcturus_root_pw arcturus > backup-$$(date +%F).sql
	@echo "Wrote backup-$$(date +%F).sql"

reset:
	$(COMPOSE) down -v
	$(COMPOSE) up -d --build
