# Makefile for building nvu shim binaries for all platforms

VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
BUILD_DIR := build
BINARY_NAME := nvu-shim

# Build flags for smaller binaries
LDFLAGS := -s -w -X main.version=$(VERSION)

.PHONY: all clean darwin-arm64 darwin-x64 linux-x64 linux-arm64 windows-x64 windows-arm64

all: darwin-arm64 darwin-x64 linux-x64 linux-arm64 windows-x64 windows-arm64

$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

darwin-arm64: $(BUILD_DIR)
	GOOS=darwin GOARCH=arm64 go build -ldflags="$(LDFLAGS)" -o $(BUILD_DIR)/$(BINARY_NAME)-darwin-arm64 .

darwin-x64: $(BUILD_DIR)
	GOOS=darwin GOARCH=amd64 go build -ldflags="$(LDFLAGS)" -o $(BUILD_DIR)/$(BINARY_NAME)-darwin-x64 .

linux-x64: $(BUILD_DIR)
	GOOS=linux GOARCH=amd64 go build -ldflags="$(LDFLAGS)" -o $(BUILD_DIR)/$(BINARY_NAME)-linux-x64 .

linux-arm64: $(BUILD_DIR)
	GOOS=linux GOARCH=arm64 go build -ldflags="$(LDFLAGS)" -o $(BUILD_DIR)/$(BINARY_NAME)-linux-arm64 .

windows-x64: $(BUILD_DIR)
	GOOS=windows GOARCH=amd64 go build -ldflags="$(LDFLAGS)" -o $(BUILD_DIR)/$(BINARY_NAME)-win32-x64.exe .

windows-arm64: $(BUILD_DIR)
	GOOS=windows GOARCH=arm64 go build -ldflags="$(LDFLAGS)" -o $(BUILD_DIR)/$(BINARY_NAME)-win32-arm64.exe .

# Build for current platform (for local testing)
build: $(BUILD_DIR)
	go build -ldflags="$(LDFLAGS)" -o $(BUILD_DIR)/$(BINARY_NAME) .

# Install shims to ~/.nvu/bin for local testing
install: build
	mkdir -p $(HOME)/.nvu/bin
	cp $(BUILD_DIR)/$(BINARY_NAME) $(HOME)/.nvu/bin/node
	cp $(BUILD_DIR)/$(BINARY_NAME) $(HOME)/.nvu/bin/npm
	cp $(BUILD_DIR)/$(BINARY_NAME) $(HOME)/.nvu/bin/npx
	@echo "Shims installed to ~/.nvu/bin/"
	@echo "Add to your PATH: export PATH=\"\$$HOME/.nvu/bin:\$$PATH\""

clean:
	rm -rf $(BUILD_DIR)

# Create release archives
release: all
	cd $(BUILD_DIR) && tar -czf $(BINARY_NAME)-darwin-arm64.tar.gz $(BINARY_NAME)-darwin-arm64
	cd $(BUILD_DIR) && tar -czf $(BINARY_NAME)-darwin-x64.tar.gz $(BINARY_NAME)-darwin-x64
	cd $(BUILD_DIR) && tar -czf $(BINARY_NAME)-linux-x64.tar.gz $(BINARY_NAME)-linux-x64
	cd $(BUILD_DIR) && tar -czf $(BINARY_NAME)-linux-arm64.tar.gz $(BINARY_NAME)-linux-arm64
	cd $(BUILD_DIR) && zip $(BINARY_NAME)-win32-x64.zip $(BINARY_NAME)-win32-x64.exe
	cd $(BUILD_DIR) && zip $(BINARY_NAME)-win32-arm64.zip $(BINARY_NAME)-win32-arm64.exe
