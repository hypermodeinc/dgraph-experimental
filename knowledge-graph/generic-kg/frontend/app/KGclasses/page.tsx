"use client";

import { useState } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

class KGClass {
  id: string = "";
  role: string = "";
  label: string = "";
  description: string = "";
}
const GET_CLASSES = gql`
  query GetClasses {
    kgClasses:kGClasses {
      id
      role
      label
      description
    }
  }
`;

const DELETE_CLASS = gql`
  mutation DeleteClass($id: String!) {
    deleteKGClass(id: $id) 
  }
`;

const ADD_CLASS = gql`
  mutation AddClass($namespace: String!, $role: String!, $label: String!, $description: String!) {
    addKGClass(role: $role, label: $label, description: $description, namespace: $namespace) 
  }
`;

export default function KGClassList() {
  const { data, loading, error, refetch } = useQuery(GET_CLASSES);
  const [deleteClass] = useMutation(DELETE_CLASS, {
    onCompleted: (resp) => { 
        console.log(resp); 
        setInfoMessage("Item deleted successfully");
        setTimeout(() => setInfoMessage(""), 3000);
        refetch();
    } ,
  });
  const [addClass] = useMutation(ADD_CLASS, {
    onCompleted: () => refetch(),
  });

  const [newClass, setNewClass] = useState({ role: "", label: "", description: "", namespace: "rag/example" });
  const [infoMessage, setInfoMessage] = useState("");

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  const handleDelete = async (id:string) => {
    await deleteClass({ variables: { id } });
  };

  const handleAdd = async () => {
    if (!newClass.role || !newClass.label || !newClass.description) return;
    await addClass({ variables: { ...newClass } });
    setNewClass({ role: "", label: "", description: "", namespace: "rag/example" });
  };

  const groupedClasses:Map<string,KGClass[]> = new Map<string,KGClass[]>();
    groupedClasses.set("MAIN", []);
    groupedClasses.set("RELATED", []);
    groupedClasses.set("RELATION", []);
  

  if (data?.kgClasses) {
    data.kgClasses.forEach((kgClass:KGClass) => {
      if (groupedClasses.get(kgClass.role)) {
        groupedClasses.get(kgClass.role)!.push(kgClass);
      }
    });
    Object.keys(groupedClasses).forEach((role) => {
      groupedClasses.get(role)!.sort((a, b) => a.label.localeCompare(b.label));
    });
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">KG Class List</h2>
      {infoMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg relative">
          {infoMessage}
          <button className="absolute top-1 right-2 text-lg" onClick={() => setInfoMessage("")}>×</button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {["MAIN", "RELATED", "RELATION"].map((role) => (
          <div key={role}>
            <h3 className="text-lg font-semibold mb-2">{role}</h3>
            {groupedClasses.get(role)!.map((kgClass) => (
              <Card key={kgClass.id} className="relative p-4 mb-2">
                <CardContent>
                  <h3 className="text-lg font-semibold">{kgClass.label}</h3>
                  <p className="text-sm text-gray-600">{kgClass.role}</p>
                  <p className="text-sm text-gray-500">{kgClass.description}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => handleDelete(kgClass.id)}
                  >
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Add New Class</h3>
        <div className="flex gap-2 mb-2">
        <Select value={newClass.role}
            onValueChange={(e) => setNewClass({ ...newClass, role: e })}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Select Role" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="MAIN">MAIN</SelectItem>
        <SelectItem value="RELATED">RELATED</SelectItem>
        <SelectItem value="RELATION">RELATION</SelectItem>
      </SelectContent>
    </Select>
          <Input
            placeholder="Label"
            value={newClass.label}
            onChange={(e) => setNewClass({ ...newClass, label: e.target.value })}
          />
          <Input
            placeholder="Description"
            value={newClass.description}
            onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
          />
          <Button onClick={handleAdd}>Add</Button>
        </div>
      </div>
    </div>
  );
}