.PHONY: help setup setup-poc setup-client start-poc start-client clean

# Default target
help:
	@echo "Available commands:"
	@echo "  setup       - Install dependencies for both POC and client"
	@echo "  setup-poc   - Install dependencies for POC only"
	@echo "  setup-client- Install dependencies for client only"
	@echo "  poc         - Start the POC development server"
	@echo "  client      - Start the client development server"
	@echo "  clean       - Clean build artifacts"

# Setup commands
setup: setup-poc setup-client

setup-poc:
	@echo "Setting up POC dependencies..."
	cd poc && npm install

setup-client:
	@echo "Setting up client dependencies..."
	cd client && npm install

# Start commands
poc:
	@echo "Starting POC development server..."
	cd poc && npm run dev

client:
	@echo "Starting client development server..."
	cd client && npm run dev

# Clean command
clean:
	@echo "Cleaning build artifacts..."
	cd poc && rm -rf dist
	cd client && rm -rf .next
