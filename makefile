install:
	npm install

dev:
	npm run dev

build:
	npm run build

lint:
	npm run build

test:
	npm run test

docker-build:
	docker build -t payment-frontend .

