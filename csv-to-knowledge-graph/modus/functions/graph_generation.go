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

func GenerateGraph(columnNames []string) (string, error) {
	if len(columnNames) == 0 {
		return "", errors.New("no column names provided")
	}

	model, err := models.GetModel[openai.ChatModel]("text-generator")
	if err != nil {
		return "", err
	}

	columnNamesStr := strings.Join(columnNames, ", ")
	promptText := fmt.Sprintf(prompts.GraphGenerationPromptTemplate, columnNamesStr)

	input, err := model.CreateInput(
		openai.NewSystemMessage(prompts.GraphGenerationInstruction),
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
	
	utils.ProcessGraphStructure(&graph, columnNames)
	
	utils.DeduplicateNodes(&graph)
	
	graphJSON, err := utils.SerializeGraph(graph)
	if err != nil {
		return "", err
	}
	
	return graphJSON, nil
}