"use client"
import KgClasses from "@/components/kg-classes";
import UploadDocument from "@/components/upload-document";
import { Button } from "@/components/ui/button"
import * as Tabs from "@radix-ui/react-tabs";
import { useState } from "react";
import { Entity } from "@/components/types";
import { GraphViewer } from "@/components/graph-viewer";

import Link from "next/link"

export default function Page() {
  const [activeTab, setActiveTab] = useState("tab1");
  const [fileContent, setFileContent] = useState<string | null>(null); // will be passed to the UploadDocument component
  const [entityData, setEntityData] = useState<Entity[]|null>(null);

  return (
    <div className="w-full p-6">
    <Tabs.Root  value={activeTab} onValueChange={setActiveTab}  className="w-full">
      {/* Tab List */}
      <Tabs.List className="flex border-b border-gray-300">
        <Tabs.Trigger
          value="tab1"
          className="px-4 py-2 text-gray-700 hover:text-black border-b-2 border-transparent focus:outline-none data-[state=active]:border-black"
        >
          Welcome
        </Tabs.Trigger>
        <Tabs.Trigger
          value="tab2"
          className="px-4 py-2 text-gray-700 hover:text-black border-b-2 border-transparent focus:outline-none data-[state=active]:border-black"
        >
          KG Schema
        </Tabs.Trigger>
        <Tabs.Trigger
          value="tab3"
          className="px-4 py-2 text-gray-700 hover:text-black border-b-2 border-transparent focus:outline-none data-[state=active]:border-black"
        >
          Upload Doc
        </Tabs.Trigger>
        <Tabs.Trigger
          value="tab4"
          className="px-4 py-2 text-gray-700 hover:text-black border-b-2 border-transparent focus:outline-none data-[state=active]:border-black"
        >
          Graph of Entities
        </Tabs.Trigger>
      </Tabs.List>

      {/* Tab Content */}
      <Tabs.Content value="tab1" className="p-4">
        <TabOne onSwitchTab={setActiveTab}  />
      </Tabs.Content>
      <Tabs.Content value="tab2" className="p-4">
        <TabTwo />
      </Tabs.Content>
      <Tabs.Content value="tab3" className="p-4">
        <UploadDocument fileContent={fileContent} setFileContent={setFileContent} entityData={entityData} setEntityData={setEntityData}/>
      </Tabs.Content>
      <Tabs.Content value="tab4" className="p-4">
        <GraphViewer />
      </Tabs.Content>
    </Tabs.Root>
  </div>
  );
}

// Components for each tab
function TabOne({ onSwitchTab }: { onSwitchTab: (tab: string) => void }) {
  return <div className="flex min-h-svh items-center justify-center">
  <div className="flex flex-col items-center gap-2">
    <h1 className="text-2xl font-bold">Knowledge Graph from unstructured text</h1>
    <div className="text-sm">Be sure to define the KGSchema in Dgraph before analyzing texts</div>
      <Button
      onClick={() => onSwitchTab("tab2")}
      size="sm"
      className="mt-4">
        KG Schema
      </Button>
      <Button onClick={() => onSwitchTab("tab3")}  size="sm" className="mt-4">
        Upload document
      </Button>


  </div>
</div>;
}

function TabTwo() {
  return <KgClasses />;
}
