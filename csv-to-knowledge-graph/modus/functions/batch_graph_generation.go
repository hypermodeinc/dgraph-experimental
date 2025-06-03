package functions

import (
	"errors"
	"fmt"
	"strings"

	_ "github.com/hypermodeinc/modus/sdk/go"
	"github.com/hypermodeinc/modus/sdk/go/pkg/models"
	"github.com/hypermodeinc/modus/sdk/go/pkg/models/openai"

	"modus/prompts"
	"modus/utils"
)

func GenerateBatchGraph(columnNamesMatrix [][]string) (string, error) {
	if len(columnNamesMatrix) == 0 {
		return "", errors.New("no column names provided")
	}

	model, err := models.GetModel[openai.ChatModel]("text-generator")
	if err != nil {
		return "", err
	}

	allColumnSets := make([]string, 0, len(columnNamesMatrix))
	for i, columnNames := range columnNamesMatrix {
		if len(columnNames) == 0 {
			continue
		}
		columnNamesStr := strings.Join(columnNames, ", ")
		allColumnSets = append(allColumnSets, fmt.Sprintf("CSV File %d: %s", i+1, columnNamesStr))
	}
	
	allColumnsJoined := strings.Join(allColumnSets, "\n")

	promptText := fmt.Sprintf(prompts.BatchGraphGenerationPromptTemplate, allColumnsJoined)

	input, err := model.CreateInput(
		openai.NewSystemMessage(prompts.BatchGraphGenerationInstruction),
		openai.NewUserMessage(promptText),
	)
	if err != nil {
		return "", err
	}

	input.Temperature = 0.2

	output, err := model.Invoke(input)
	if err != nil {
		return "", err
	}

	content := strings.TrimSpace(output.Choices[0].Message.Content)
	
	graph := utils.ParseTupleGraphString(content)
	
	allColumnNames := make([]string, 0)
	for _, columnNames := range columnNamesMatrix {
		allColumnNames = append(allColumnNames, columnNames...)
	}
	
	utils.ProcessGraphStructure(&graph, allColumnNames)
	
	utils.DeduplicateNodes(&graph)
	
	graphJSON, err := utils.SerializeGraph(graph)
	if err != nil {
		return "", err
	}
	
	return graphJSON, nil
}