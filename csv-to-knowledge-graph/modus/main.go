package main

import (
	"modus/functions"

	_ "github.com/hypermodeinc/modus/sdk/go"
)

func GenerateGraph(columnNames []string) (string, error) {
	return functions.GenerateGraph(columnNames)
}

func GenerateRDFTemplate(graphJson string) (string, error) {
	return functions.GenerateRDFTemplate(graphJson)
}

func GenerateDgraphQueries(schema string, previousQuery string) (string, error) {
	return functions.GenerateDgraphQueries(schema, previousQuery)
}

func GenerateBatchGraph(columnNamesMatrix [][]string) (string, error) {
	return functions.GenerateBatchGraph(columnNamesMatrix)
}

func GenerateBatchRDFTemplate(graphJson string, fileColumnNamesMatrix [][]string) (string, error) {
	return functions.GenerateBatchRDFTemplate(graphJson, fileColumnNamesMatrix)
}