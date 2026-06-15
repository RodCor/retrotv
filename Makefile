# RetroTV convenience commands. Usage: make <target>
COMPOSE = docker compose

.PHONY: help setup up down build logs assets add-furni emu-restart emu-logs cms-restart db backup reset

help:
	@echo "RetroTV targets:"
	@echo "  make setup       - fetch the nitro submodule(s) + fix line endings + create .env"
	@echo "  make up          - build + start the whole stack (detached)"
	@echo "  make down        - stop the stack"
	@echo "  make logs        - follow emulator + nitro + cms logs"
	@echo "  make swf-pack    - adopt a recent HabboAssets clothing SWF pack (then: make assets)"
	@echo "  make assets      - generate/convert the Nitro client assets (run once)"
	@echo "  make add-furni   - add ONE new furni from a .swf (SWF=… CLASS=… NAME=… [X= Y= Z= TYPE=floor|wall SITON=1 …])"
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

swf-pack:
	bash scripts/use-swf-pack.sh

assets:
	docker exec retrotv-nitro bash -c "cp /app/configuration/nitro-converter/configuration.json /app/nitro-converter/configuration.json"
	docker exec retrotv-nitro bash -c "cd /app/nitro-converter; yarn ts-node-dev --transpile-only src/Main.ts"
	docker exec retrotv-nitro bash -c "rsync -r /app/nitro-converter/assets/* /app/nitro-assets/"
	@echo "Assets generated. Hard-refresh the client."

# Add a single new furni from a .swf. Example:
#   make add-furni SWF=./mychair.swf CLASS=retrotv_chair NAME="Silla RetroTV" X=1 Y=1 SITON=1
add-furni:
	@node scripts/add-furni.mjs \
	  --swf "$(SWF)" --class "$(CLASS)" --name "$(NAME)" \
	  $(if $(TYPE),--type $(TYPE),) $(if $(X),--x $(X),) $(if $(Y),--y $(Y),) $(if $(Z),--z $(Z),) \
	  $(if $(CATEGORY),--category $(CATEGORY),) $(if $(REVISION),--revision $(REVISION),) \
	  $(if $(SITON),--siton,) $(if $(LAYON),--layon,) $(if $(STANDON),--standon,) \
	  $(if $(DESCRIPTION),--description "$(DESCRIPTION)",)

emu-restart:
	$(COMPOSE) restart arcturus

emu-logs:
	docker logs -f retrotv-arcturus

cms-restart:
	$(COMPOSE) up -d --build cms

db:
	@set -a; [ -f .env ] && . ./.env; set +a; \
	docker exec -it retrotv-mysql mariadb -u "$${DB_USER:-arcturus_user}" -p"$${DB_PASSWORD:-arcturus_pw}" "$${DB_NAME:-habbo}"

backup:
	@set -a; [ -f .env ] && . ./.env; set +a; \
	docker exec retrotv-mysql mariadb-dump -u root -p"$${DB_ROOT_PASSWORD:-arcturus_root_pw}" "$${DB_NAME:-habbo}" > backup-$$(date +%F).sql
	@echo "Wrote backup-$$(date +%F).sql"

reset:
	$(COMPOSE) down -v
	$(COMPOSE) up -d --build
