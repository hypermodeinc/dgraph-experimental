# Build dgraph/learning image
# Usage:
#
# For latest tag:
#     Build, based on dgraph/dgraph:latest:
#       make

# For $TAG tag, set DGRAPH_VERSION:
#     Build, based on dgraph/dgraph:latest:
#       make DGRAPH_VERSION=$TAG

.PHONY: all build

export DGRAPH_VERSION ?= latest

all: build

build:
	docker build -t dgraph/learning:${DGRAPH_VERSION} --build-arg DGRAPH_VERSION=${DGRAPH_VERSION} .

