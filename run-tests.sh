#!/bin/bash

# 3Compute Test Runner
# This script runs all tests for both frontend and backend

set -e  # Exit on any error

echo "🧪 Running 3Compute Test Suite"
echo "================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "README.md" ] || [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    print_error "Please run this script from the 3Compute root directory"
    exit 1
fi

# Backend Tests
print_status "Running backend tests..."

# Check if test dependencies are installed
if [ ! -f "backend/requirements-test.txt" ]; then
    print_error "Backend test requirements not found"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    print_status "Creating Python virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
print_status "Installing backend dependencies..."
pip install -q --upgrade pip
pip install -q -r backend/requirements.txt
pip install -q -r backend/requirements-test.txt

# Run backend tests from root directory with proper Python path
print_status "Executing backend tests with coverage..."
export PYTHONPATH="$PWD:$PYTHONPATH"
if python -m pytest backend/ --cov=backend --cov-report=term-missing --cov-report=xml:backend/coverage.xml -v; then
    print_success "Backend tests passed!"
else
    print_error "Backend tests failed!"
    exit 1
fi

# Frontend Tests
print_status "Running frontend tests..."
cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_status "Installing frontend dependencies..."
    pnpm install
fi

# Run linting
print_status "Running frontend linting..."
if pnpm lint; then
    print_success "Frontend linting passed!"
else
    print_error "Frontend linting failed!"
    exit 1
fi

# Run frontend tests
print_status "Executing frontend tests with coverage..."
if pnpm test:coverage; then
    print_success "Frontend tests passed!"
else
    print_error "Frontend tests failed!"
    exit 1
fi

cd ..

# Summary
echo ""
echo "🎉 All tests completed successfully!"
echo "================================"
print_success "Backend tests: PASSED"
print_success "Frontend linting: PASSED" 
print_success "Frontend tests: PASSED"
echo ""
echo "Ready to commit! 🚀"