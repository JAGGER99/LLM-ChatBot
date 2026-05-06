import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

type RawCorpusFile = {
  relativePath: string;
  content: string;
};

export type PreparedChunk = {
  chunkId: string;
  content: string;
  metadata: Record<string, unknown>;
};

const SUPPORTED_EXTENSIONS = new Set([".md", ".markdown", ".txt", ".json"]);

async function collectFiles(dir: string, rootDir = dir): Promise<RawCorpusFile[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: RawCorpusFile[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath, rootDir)));
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(extension)) {
      continue;
    }

    const content = await fs.readFile(fullPath, "utf8");
    const relativePath = path.relative(rootDir, fullPath).replaceAll("\\", "/");
    files.push({ relativePath, content });
  }

  return files;
}

function createChunkId(relativePath: string, index: number, content: string) {
  return createHash("sha256")
    .update(`${relativePath}:${index}:${content}`)
    .digest("hex");
}

export async function buildCorpusChunks(inputDir: string, datasetId: string) {
  const files = await collectFiles(path.resolve(inputDir));

  if (files.length === 0) {
    throw new Error(
      `No supported files found in ${inputDir}. Add .md, .markdown, .txt, or .json files first.`,
    );
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1200,
    chunkOverlap: 220,
  });

  const preparedChunks: PreparedChunk[] = [];

  for (const file of files) {
    const pieces = await splitter.splitText(file.content);

    pieces.forEach((content, index) => {
      preparedChunks.push({
        chunkId: createChunkId(file.relativePath, index, content),
        content,
        metadata: {
          datasetId,
          source: file.relativePath,
          chunkIndex: index,
          ingestedAt: new Date().toISOString(),
          title: path.basename(file.relativePath, path.extname(file.relativePath)),
        },
      });
    });
  }

  return preparedChunks;
}

