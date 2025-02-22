"use client";

import { useState } from "react";
import { gql, useLazyQuery, useMutation } from "@apollo/client";
import { Button } from "@/components/ui/button";
import { Entity } from "./types";
// function=extractEntities or simulateEntities
const UPLOAD_TEXT_QUERY = gql`
  query ExtractEntities($content: String!) {
    entities: extractEntities(text: $content) {
      label
      is_a
      description
    }
  }
`;

const SAVE_ENTITIES_MUTATION = gql`
  mutation SaveEntities($r: [EntityInput!]!) {
    saveEntities(entities: $r)
  }
`;

interface FileUploadProps {
  fileContent: string | null;
  setFileContent: (content: string | null) => void;
  entityData: Entity[] | null;
  setEntityData: (entities: Entity[] | null) => void;
}

export default function UploadDocument({
  fileContent,
  setFileContent,
  entityData,
  setEntityData,
}: FileUploadProps) {
  //const [fileContent, setFileContent] = useState<string | null>(null);

  const [fileLoading, setFileLoading] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [uploadText, { loading, data }] = useLazyQuery(UPLOAD_TEXT_QUERY, {
    fetchPolicy: "network-only", // Ensures it always fetches fresh data
  });

  const [saveEntities, { loading: mutationLoading, error: mutationError }] =
    useMutation(SAVE_ENTITIES_MUTATION, {
      onCompleted: (data) => {
        console.log(JSON.stringify(data, null, 2));
      },
    });
  const handleSaveEntities = (entities: any[]) => {
    saveEntities({
      variables: { r: entities }, // Pass entities dynamically
    });
  };
  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "text/plain") {
      setError("Only text files are allowed. Got " + file.type);
      return;
    }

    setFileLoading(true);
    setError(null);
    setSuccess(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      setFileContent(content);
      // await sendToGraphQL(content);
      setFileLoading(false);
    };
    reader.onerror = () => {
      setError("Error reading file.");
      setFileLoading(false);
    };

    reader.readAsText(file);
  };

  const sendToGraphQL = async (content: string) => {
    setThinking(true);
    try {
      const { data } = await uploadText({ variables: { content } });
      console.log("GraphQL Response:", JSON.stringify(data, null, 2));
      const entities:Entity[] = data.entities; 
      setEntityData(entities);
      setThinking(false);
    } catch (err) {
      setError("GraphQL request failed.");
      setThinking(false);
      return null;
    }
  };

  return (
    <div>
      <div className="container mx-auto py-8">
        <h2 className="text-lg font-semibold mb-2">Upload a Text File</h2>
        <input
          type="file"
          accept=".txt"
          onChange={handleFileChange}
          className="mb-2"
        />
        {error && <p className="text-red-500">{error}</p>}
        {success && <p className="text-green-500">{success}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Display Text Content */}
        <div className="bg-white p-4 rounded-md shadow-md">
          <h3 className="text-lg font-semibold">File Content</h3>
          <pre className="whitespace-pre-wrap text-sm text-gray-700">
            {fileContent || "No file uploaded yet."}
          </pre>
        </div>
        {/* Right Column: Display Entities List */}
        <div className="bg-white p-4 rounded-md shadow-md">
          {fileContent && !thinking && (
            <Button
              size="sm"
              className="mt-4"
              onClick={() => sendToGraphQL(fileContent)}
            >
              Extract Entities
            </Button>
          )}
          {entityData && (
            <Button
              size="sm"
              className="mt-4"
              onClick={() => handleSaveEntities(entityData)}
            >
              Save Entities
            </Button>
          )}
          {thinking && <p>Thinking...</p>}
          <h3 className="text-lg font-semibold">Entities</h3>
          <ul className="list-none space-y-2">
            {entityData && entityData.length > 0 ? (
              entityData.map((entity: any, index: number) => (
                <li key={index} className="border-b pb-2">
                  <p className="font-medium">{entity.label}</p>
                  <p className="text-sm text-gray-500">{entity.is_a}</p>
                  <p className="text-xs">{entity.description}</p>
                </li>
              ))
            ) : (
              <p className="text-sm text-gray-500">No entities found.</p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
