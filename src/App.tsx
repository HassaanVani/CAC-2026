import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, Hand, MessageSquare, X } from "lucide-react";
import Conversation from "./components/Conversation";
import Practice from "./components/Practice";
export default function App() {
  const [tab, setTab] = useState<"conversation" | "practice">("conversation"),
    [about, setAbout] = useState(false);
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
      <header className="site-header">
        <a
          className="brand"
          href="#"
          aria-label="Common home"
          onClick={(e) => {
            e.preventDefault();
            setTab("conversation");
          }}
        >
          <img src={`${import.meta.env.BASE_URL}common-mark.svg`} alt="" />
          <span>
            common<span className="brand-period">.</span>
          </span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <button
            className={tab === "conversation" ? "active" : ""}
            aria-current={tab === "conversation" ? "page" : undefined}
            onClick={() => setTab("conversation")}
          >
            <MessageSquare size={17} />
            Conversation
          </button>
          <button
            className={tab === "practice" ? "active" : ""}
            aria-current={tab === "practice" ? "page" : undefined}
            onClick={() => setTab("practice")}
          >
            <Hand size={18} />
            Sign studio
          </button>
        </nav>
        <button className="about-link" onClick={() => setAbout(true)}>
          About Common <ArrowUpRight size={14} />
        </button>
      </header>
      <main id="workspace" tabIndex={-1}>
        <div className="page-heading">
          <div>
            <span className="page-kicker">
              {tab === "conversation"
                ? "A SHARED SPACE, AT YOUR PACE"
                : "LEARN IT. SIGN IT. SHARE IT."}
            </span>
            <h1>
              {tab === "conversation"
                ? "Every conversation, a little closer."
                : "From a handshape to a hello."}
            </h1>
            <p>
              {tab === "conversation"
                ? "Live captions and thoughtful replies. Two sides of the same conversation."
                : "Practice your letters and turn fingerspelling into text, all in one place."}
            </p>
          </div>
          <div className="page-side-note">
            <span className="small-star" aria-hidden="true">
              ✳
            </span>
            <span>
              {tab === "conversation" ? (
                <>
                  Different ways to speak.
                  <br />A common understanding.
                </>
              ) : (
                <>
                  Start small.
                  <br />
                  Say something that matters.
                </>
              )}
            </span>
          </div>
        </div>
        <div hidden={tab !== "conversation"}>
          <Conversation active={tab === "conversation"} />
        </div>
        {tab === "practice" && <Practice />}
        <footer className="site-footer">
          <span>Made for connection. Open to everyone.</span>
          <button className="text-button" onClick={() => setAbout(true)}>
            A student-built accessibility project <ArrowUpRight size={13} />
          </button>
        </footer>
      </main>
      {about && (
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
          <img
            className="about-mark"
            src={`${import.meta.env.BASE_URL}common-mark.svg`}
            alt="Common’s C and ear logo"
          />
          <span className="eyebrow">MORE WAYS TO BE UNDERSTOOD</span>
          <h2 id="about-title">Find a little common ground.</h2>
          <p>
            Common is a student-built communication tool for Deaf,
            hard-of-hearing, and hearing people. It brings captions, replies,
            and introductory ASL fingerspelling into one shared space.
          </p>
          <ul>
            <li>
              <Check size={16} />
              No account. Conversation text stays in this tab.
            </li>
            <li>
              <Check size={16} />
              Camera processing and personal pose examples stay on your device.
            </li>
            <li>
              <Check size={16} />
              Speech services may process audio through your browser provider.
            </li>
          </ul>
          <p>
            Sign studio supports 17 letters, including the demo phrase “Hi, this
            is Common.” C and O include built-in curve matching; M, N, S, and T
            use independent personal examples. Handshape feedback is
            experimental; it does not translate full ASL or assess fluency.
          </p>
          <a
            href="https://www.lifeprint.com/asl101/fingerspelling/abc.htm"
            target="_blank"
            rel="noreferrer"
          >
            Learn with ASL University <ArrowUpRight size={14} />
          </a>
          <button className="primary-button" onClick={closeAbout}>
            Back to Common
          </button>
        </dialog>
      )}
    </div>
  );
}
