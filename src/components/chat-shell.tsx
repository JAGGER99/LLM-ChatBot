"use client";

import { useEffect, useState, useTransition } from "react";

import { sampleQuestions } from "@/lib/sample-questions";
import type { ChatMessage, ChatResponse, CorpusStats } from "@/lib/types";

const starterMessage: ChatMessage = {
  role: "assistant",
  content:
    "Ask about your indexed corpus and I'll answer with retrieved evidence, source citations, and a retrieval confidence signal.",
};

export function ChatShell() {
  const [messages, setMessages] = useState<ChatMessage[]>([starterMessage]);
  const [input, setInput] = useState("");
  const [datasetId, setDatasetId] = useState("default-corpus");
  const [latestResponse, setLatestResponse] = useState<ChatResponse | null>(null);
  const [stats, setStats] = useState<CorpusStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingUi, startTransition] = useTransition();
  const [isChatting, setIsChatting] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);

  async function loadStats(nextDatasetId: string, options?: { syncDataset?: boolean }) {
    setIsLoadingStats(true);

    try {
      const response = await fetch(`/api/stats?datasetId=${encodeURIComponent(nextDatasetId)}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load corpus stats.");
      }

      setError(null);
      startTransition(() => {
        setStats(payload);
        if (options?.syncDataset) {
          setDatasetId(payload.datasetId);
        }
      });
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load stats.");
    } finally {
      setIsLoadingStats(false);
    }
  }

  useEffect(() => {
    void loadStats("default-corpus", { syncDataset: true });
  }, []);

  async function sendMessage(message: string) {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    const history = messages.filter((entry) => entry !== starterMessage);
    const nextMessages = [...messages, { role: "user", content: trimmed } satisfies ChatMessage];

    setMessages(nextMessages);
    setInput("");
    setError(null);
    setIsChatting(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          history,
          datasetId,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Chat request failed.");
      }

      startTransition(() => {
        setLatestResponse(payload);
        setMessages((current) => [
          ...current,
          { role: "assistant", content: payload.answer } satisfies ChatMessage,
        ]);
      });
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : "Chat request failed.");
    } finally {
      setIsChatting(false);
    }
  }

  async function ingestLocalCorpus() {
    setIsIngesting(true);
    setError(null);

    try {
      const response = await fetch("/api/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ datasetId }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Ingestion failed.");
      }

      await loadStats(datasetId);

      setLatestResponse(null);
      setMessages([
        starterMessage,
        {
          role: "assistant",
          content: `Indexed ${payload.chunkCount} chunks across ${payload.fileCount} files for dataset "${payload.datasetId}". Ask a question when you're ready.`,
        },
      ]);
    } catch (ingestError) {
      setError(ingestError instanceof Error ? ingestError.message : "Ingestion failed.");
    } finally {
      setIsIngesting(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <p className="eyebrow">LangChain + LangGraph + Supabase RAG</p>
        <h1>Recruiter-ready chatbot for large document corpora.</h1>
        <p className="hero-copy">
          This local browser app chunks a corpus, embeds it into Supabase, routes each question
          through a LangGraph retrieval pipeline, and returns grounded answers with source-aware
          context.
        </p>

        <div className="signal-grid">
          <article className="signal-card">
            <span>Corpus</span>
            <strong>{stats?.totalChunks ?? 0}</strong>
            <p>indexed chunks currently available for retrieval.</p>
          </article>
          <article className="signal-card">
            <span>Dataset</span>
            <strong>{stats?.datasetId ?? datasetId}</strong>
            <p>metadata filter passed into vector search.</p>
          </article>
          <article className="signal-card">
            <span>Flow</span>
            <strong>Rewrite - Retrieve - Answer</strong>
            <p>implemented as an explicit LangGraph state machine.</p>
          </article>
        </div>

        <div className="control-bar">
          <label className="field">
            <span>Dataset label</span>
            <input
              value={datasetId}
              onChange={(event) => setDatasetId(event.target.value)}
              placeholder="default-corpus"
            />
          </label>
          <button className="secondary-button" onClick={ingestLocalCorpus} disabled={isIngesting}>
            {isIngesting ? "Indexing corpus..." : "Ingest local corpus"}
          </button>
          <button
            className="secondary-button"
            onClick={() => void loadStats(datasetId)}
            disabled={isLoadingStats || isIngesting}
          >
            {isLoadingStats ? "Refreshing dataset..." : "Load dataset"}
          </button>
        </div>

        <div className="source-strip">
          {(stats?.sources ?? []).map((source) => (
            <span key={source}>{source}</span>
          ))}
        </div>
      </section>

      <section className="workspace-grid">
        <div className="chat-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Chat</p>
              <h2>Grounded Q&A</h2>
            </div>
            <div className="status-pill">
              {isChatting ? "Thinking..." : isLoadingStats ? "Refreshing..." : "Ready"}
            </div>
          </div>

          <div className="sample-row">
            {sampleQuestions.map((question) => (
              <button
                key={question}
                className="ghost-chip"
                onClick={() => void sendMessage(question)}
                disabled={isChatting || isIngesting}
              >
                {question}
              </button>
            ))}
          </div>

          <div className="message-list">
            {messages.map((message, index) => (
              <article
                key={`${message.role}-${index}`}
                className={message.role === "assistant" ? "message assistant" : "message user"}
              >
                <span>{message.role === "assistant" ? "Assistant" : "You"}</span>
                <p>{message.content}</p>
              </article>
            ))}
          </div>

          <form
            className="composer"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage(input);
            }}
          >
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about the indexed corpus..."
              rows={4}
            />
            <button
              className="primary-button"
              type="submit"
              disabled={isChatting || isIngesting || !input.trim() || isUpdatingUi}
            >
              Send
            </button>
          </form>
        </div>

        <aside className="inspector-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Inspector</p>
              <h2>Retrieval trace</h2>
            </div>
            <div className="status-pill subtle">
              {latestResponse ? `Confidence ${latestResponse.confidence}` : "Awaiting query"}
            </div>
          </div>

          {error ? <div className="error-banner">{error}</div> : null}

          <div className="inspector-section">
            <h3>Rewritten question</h3>
            <p>
              {latestResponse?.rewrittenQuestion ??
                "Your latest standalone retrieval query will show up here."}
            </p>
          </div>

          <div className="inspector-section">
            <h3>Retrieved sources</h3>
            <div className="source-list">
              {(latestResponse?.sources ?? []).map((source, index) => (
                <article key={source.chunkId} className="source-card">
                  <div className="source-meta">
                    <strong>S{index + 1}</strong>
                    <span>{String(source.metadata.source ?? "unknown-source")}</span>
                  </div>
                  <p>{source.content}</p>
                  <small>Similarity {source.similarity.toFixed(3)}</small>
                </article>
              ))}
              {!latestResponse?.sources?.length ? (
                <p className="empty-state">
                  Retrieved chunks will appear here after the first question.
                </p>
              ) : null}
            </div>
          </div>

          <div className="inspector-section">
            <h3>What recruiters can see</h3>
            <ul className="fact-list">
              <li>LangGraph state orchestration rather than a single monolithic chain.</li>
              <li>Supabase vector retrieval filtered by dataset metadata.</li>
              <li>Local ingestion pipeline for large folders of source documents.</li>
              <li>Source citations and confidence scoring surfaced in the UI.</li>
            </ul>
          </div>
        </aside>
      </section>
    </main>
  );
}
