ROOT_PACKAGE:=github.com/mkaiho/aws-batch-sample
BIN_DIR:=_deployment/bin
SRC_DIR:=$(shell go list ./cmd/...)
BINARIES:=$(SRC_DIR:$(ROOT_PACKAGE)/%=$(BIN_DIR)/%)
ARCHIVE_DIR:=$(BIN_DIR)/zip
ARCHIVES:=$(SRC_DIR:$(ROOT_PACKAGE)/%=$(ARCHIVE_DIR)/%)


.PHONY: build
build: clean $(BINARIES)

$(BINARIES):
	go build -o $@ $(@:$(BIN_DIR)/%=$(ROOT_PACKAGE)/%)

.PHONY: archive
archive: $(ARCHIVES)

$(ARCHIVES):$(BINARIES)
	@test -d $(ARCHIVE_DIR) || mkdir $(ARCHIVE_DIR)
	@test -d $(ARCHIVE_DIR)/cmd || mkdir $(ARCHIVE_DIR)/cmd
	@zip -j $@.zip $(@:$(ARCHIVE_DIR)/%=$(BIN_DIR)/%)

.PHONY: dev-deps
dev-deps:
	go install gotest.tools/gotestsum@v1.7.0
	go install github.com/vektra/mockery/v2@latest

.PHONY: deps
deps:
	go mod download

.PHONY: gen-mock
gen-mock:
	make dev-deps
	mockery --all --case underscore --recursive --keeptree

.PHONY: test
test:
	# gotestsum ./entity/... ./usecase/... ./adapter/... ./infrastructure/...
	gotestsum ./...

.PHONY: test-report
test-report:
	@rm -rf ./test-results
	@mkdir -p ./test-results
	# gotestsum --junitfile ./test-results/unit-tests.xml ./entity/... ./usecase/... ./adapter/... ./infrastructure/...
	gotestsum --junitfile ./test-results/unit-tests.xml ./...

.PHONY: clean
clean:
	@rm -rf ${BIN_DIR}