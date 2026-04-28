#!/bin/bash
rm -rf ./dist
find ./packages -type d -name "dist" -exec rm -rf {} +