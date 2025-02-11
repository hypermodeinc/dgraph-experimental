.PHONY: bios data local-image publish-image help

python-version: ## Check python version and required packages
	@python -c 'import sys; ver = sys.version_info; \
	assert ver.major == 3 and ver.minor >= 11, \
	"Python 3.11+ is required, but found {}.{}".format(ver.major, ver.minor)'
	@python -c "import pkg_resources; pkg_resources.require(open('requirements.txt',mode='r'))" 2>/dev/null \
	|| (echo "Run 'pip install -r requirements.txt' to install missing packages" && exit 1)

bios: python-version ## Generate bios if bios.json doesn't exist
ifeq (,$(wildcard ./bios.json))
	echo "Generating bios..."
	python generate_bios.py
else
	@echo "bios.json already exists"
endif

data: python-version ## Generate data if dgraph_data.json doesn't exist
ifeq (,$(wildcard ./dgraph_data.json))
	echo "Generating data..."
	python generate.py
else
	@echo "dgraph_data.json already exists"
endif

local-image: bios data ## Build the self-contained Dgraph and Jupyter Lab local image
	docker build -t dgraph-foaf-graph .

publish-image: bios data ## Build the self-contained Dgraph and Jupyter Lab image and publish
	# need to be logged in to dockerhub for this to work, `docker login -u matthewmcneely`
	docker buildx build --platform linux/amd64 --platform linux/arm64 -t matthewmcneely/dgraph-foaf-graph --output=type=registry .

help: ## Print target help
	@grep -E '^[0-9a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
