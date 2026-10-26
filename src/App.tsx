import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Hand,
  Heart,
  MessageSquare,
  X,
} from "lucide-react";
import Conversation from "./components/Conversation";
import Practice from "./components/Practice";
export default function App() {
  const [tab, setTab] = useState<"conversation" | "practice">("conversation");
  const [about, setAbout] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (about && dialog.current && !dialog.current.open)
      dialog.current.showModal();
  }, [about]);
  function closeAbout() {
    dialog.current?.close();
    setAbout(false);
  }
  return (
    <div className="app-shell">
      <a href="#workspace" className="skip-link">
        Skip to workspace
      </a>
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          aria-label="Common home"
          onClick={(e) => {
            e.preventDefault();
            setTab("conversation");
          }}
        >
          <svg width="35" height="35" viewBox="0 0 40 40" aria-hidden="true">
            <path
              d="M23 10a11 11 0 1 0 0 20M32 10a11 11 0 1 0 0 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
          </svg>
          <span>
            common<span className="brand-period">.</span>
          </span>
        </a>
        <div className="sidebar-middle">
          <p className="nav-label">A SHARED SPACE</p>
          <nav aria-label="Main navigation">
            <button
              className={`nav-item ${tab === "conversation" ? "active" : ""}`}
              aria-current={tab === "conversation" ? "page" : undefined}
              onClick={() => setTab("conversation")}
            >
              <MessageSquare size={19} />
              <span>Conversation</span>
              {tab === "conversation" && <span className="nav-active-dot" />}
            </button>
            <button
              className={`nav-item ${tab === "practice" ? "active" : ""}`}
              aria-current={tab === "practice" ? "page" : undefined}
              onClick={() => setTab("practice")}
            >
              <Hand size={20} />
              <span>ASL practice</span>
              {tab === "practice" && <span className="nav-active-dot" />}
            </button>
          </nav>
          <div className="sidebar-note">
            <div className="note-line" />
            <p>
              Different ways to speak.
              <br />A common understanding.
            </p>
          </div>
        </div>
        <div className="sidebar-bottom">
          <div className="made-for">
            <Heart size={15} />
            <span>Made for connection.</span>
          </div>
          <button className="about-link" onClick={() => setAbout(true)}>
            About Common <ArrowUpRight size={14} />
          </button>
          <span className="version">A STUDENT-BUILT ACCESSIBILITY PROJECT</span>
        </div>
      </aside>
      <main id="workspace" tabIndex={-1}>
        <header className="topbar">
          <span>LESS DISTANCE. MORE UNDERSTANDING.</span>
          <button className="project-badge" onClick={() => setAbout(true)}>
            <span />
            Built with purpose
            <ArrowUpRight size={13} />
          </button>
        </header>
        <div className="workspace-content">
          <div className="page-heading">
            <div>
              <div className="page-kicker">
                {tab === "conversation"
                  ? "LET’S FIND COMMON GROUND"
                  : "ONE LETTER AT A TIME"}
              </div>
              <h1>
                {tab === "conversation"
                  ? "Good conversations start here."
                  : "Connection is something we learn."}
              </h1>
              <p>
                {tab === "conversation"
                  ? "A little help listening. A little space to reply."
                  : "Make a little room for a new way to communicate."}
              </p>
            </div>
            <span className="workspace-index">
              {tab === "conversation"
                ? "01 / CONVERSATION"
                : "02 / ASL PRACTICE"}
            </span>
          </div>
          <div hidden={tab !== "conversation"}>
            <Conversation active={tab === "conversation"} />
          </div>
          {tab === "practice" && <Practice />}
          <footer className="workspace-footer">
            <span>Communication belongs to everyone.</span>
            <span>
              COMMON <span className="footer-spark">✳</span> FIND YOUR WAY TO
              CONNECT
            </span>
          </footer>
        </div>
      </main>
      {about && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAbout();
          }}
        >
          <dialog
            ref={dialog}
            className="about-dialog"
            aria-labelledby="about-title"
            onCancel={(e) => {
              e.preventDefault();
              closeAbout();
            }}
          >
            <button
              autoFocus
              className="icon-button modal-close"
              aria-label="Close about Common"
              onClick={closeAbout}
            >
              <X size={20} />
            </button>
            <span className="eyebrow">BUILT WITH PURPOSE</span>
            <h2 id="about-title">More ways to be understood.</h2>
            <p>
              Common is a student-built communication tool for Deaf,
              hard-of-hearing, and hearing people. It brings captions, typed
              replies, and introductory ASL handshape practice into one space.
            </p>
            <ul>
              <li>
                <Check size={16} />
                No accounts or transcript storage.
              </li>
              <li>
                <Check size={16} />
                Camera video is processed on your device.
              </li>
              <li>
                <Check size={16} />
                Speech recognition may use your browser provider’s online
                service.
              </li>
            </ul>
            <p>
              Handshape feedback is experimental, not an assessment of ASL
              proficiency. Loudness and pace describe sound, not emotion. Common
              does not replace an interpreter.
            </p>
            <a
              href="https://www.lifeprint.com/asl101/fingerspelling/abc.htm"
              target="_blank"
              rel="noreferrer"
            >
              Continue learning with ASL University <ArrowUpRight size={14} />
            </a>
            <button className="primary-button" onClick={closeAbout}>
              Back to the conversation
            </button>
          </dialog>
        </div>
      )}
    </div>
  );
}
