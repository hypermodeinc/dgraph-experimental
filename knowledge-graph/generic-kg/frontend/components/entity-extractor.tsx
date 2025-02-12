"use client";

import { useState } from "react";
import { gql, useLazyQuery } from "@apollo/client";


const UPLOAD_TEXT_QUERY = gql`
query ExtractEntities($content: String!){
    entities:extractEntities(text: $content) {
        label
        is_a
        description
    }
}
`;

interface EntityExtractorProps {
  fileContent: string | null;
  entities: any | null;
  setEntities: (entities: any | null) => void;
}

export default function EntityExtractor( { fileContent, entities, setEntities }: FileUploadProps) {
  //const [fileContent, setFileContent] = useState<string | null>(null);
  const [responseData, setResponseData] = useState<any>(null); 
  const [fileLoading, setFileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);


  consyt functin extractEntities() {
    sendToGraphQL(fileContent)
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
      await sendToGraphQL(content);
      setFileLoading(false);
    };
    reader.onerror = () => {
      setError("Error reading file.");
      setFileLoading(false);
    };

    reader.readAsText(file);
  };

  const sendToGraphQL = async (content: string) =>{
    try {
      const { data } = await uploadText({ variables: { content } });
      console.log("GraphQL Response:", JSON.stringify(data, null, 2));
      setResponseData(data);
    } catch (err) {
      setError("GraphQL request failed.");
      return null;
    }
  };
  
  return (
    <div>
    </div>)

}
