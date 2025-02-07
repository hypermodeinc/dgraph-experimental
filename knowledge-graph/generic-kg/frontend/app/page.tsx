import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Page() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-bold">Knowledge Graph from unstructured text</h1>
        <div className="text-sm">Be sure to define the KGSchema in Dgraph before analyzing texts</div>
        <Link href="/upload">
          <Button size="sm" className="mt-4">
            Upload document
          </Button>
        </Link>

      </div>
    </div>
  )
}
