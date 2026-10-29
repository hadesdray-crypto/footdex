import { useMemo, useState } from "react";
import { bonneReponse, faute } from "../mascot/terrain";
import { LuGift, LuRotateCcw } from "react-icons/lu";
import type { Album, QuizQuestion } from "../data";
import { DAILY_PASS, DAILY_TOTAL, dailyQuiz, type Question } from "../quiz";
import { recordBigQuiz, recordQuiz, useStore } from "../store";
import { Link, PageTitle } from "../ui/bits";
import { cx, dayKey, longDate } from "../util";

function Runner({ questions, onDone, finalText }: { questions: Question[]; onDone: (score: number) => void; finalText: (score: number) => string }) {
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const q = questions[step];

  if (done) {
    return (
      <section className="quizresult">
        <p className="eyebrow">Résultat</p>
        <p className="quizresult__score">
          {score}/{questions.length}
        </p>
        <p>{finalText(score)}</p>
      </section>
    );
  }
  if (!q) return null;
  return (
    <section className="quiz">
      <p className="quiz__step">
        Question {step + 1} sur {questions.length}
      </p>
      <h2 className="quiz__prompt">{q.prompt}</h2>
      <ul className="quiz__choices">
        {q.choices.map((choice, i) => {
          const state = picked === null ? "idle" : i === q.answer ? "good" : i === picked ? "bad" : "idle";
          return (
            <li key={`${choice}-${i}`}>
              <button
                type="button"
                className={cx("quiz__choice", `quiz__choice--${state}`)}
                disabled={picked !== null}
                onClick={() => {
                  setPicked(i);
                  if (i === q.answer) {
                    setScore((s) => s + 1);
                    bonneReponse();
                  } else faute("reponse");
                }}
              >
                {choice}
              </button>
            </li>
          );
        })}
      </ul>
      {picked !== null ? (
        <div className="quiz__why">
          <p className="quiz__verdict">{picked === q.answer ? "Bonne réponse." : "Pas cette fois."}</p>
          <p>{q.why}</p>
          <button
            type="button"
            className="btn btn--pitch"
            onClick={() => {
              if (step + 1 >= questions.length) {
                setDone(true);
                onDone(score);
              } else {
                setStep((s) => s + 1);
                setPicked(null);
              }
            }}
          >
            {step + 1 >= questions.length ? "Voir le score" : "Question suivante"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

export function Defi({ album }: { album: Album }) {
  const state = useStore();
  const today = dayKey();
  const questions = useMemo(() => dailyQuiz(album, today), [album, today]);
  const result = state.quiz?.day === today ? state.quiz : null;
  const [practice, setPractice] = useState(0);

  return (
    <div>
      <PageTitle kicker={`Défi du ${longDate(today)}`} title="Le défi du jour">
        <p>
          {DAILY_TOTAL} questions, tirées de l'album. {DAILY_PASS} bonnes réponses et tu gagnes un 2<sup>e</sup> paquet aujourd'hui. Un seul essai compte pour le bonus ;
          tu peux rejouer pour t'entraîner.
        </p>
      </PageTitle>

      {result ? (
        <section className={cx("quizbanner", result.passed && "quizbanner--won")}>
          <p className="quizbanner__score">
            {result.score}/{result.total}
          </p>
          <div>
            <p>{result.passed ? "Défi réussi : ton paquet bonus t'attend." : `Il fallait ${DAILY_PASS} bonnes réponses. Nouveau défi demain.`}</p>
            {result.passed ? (
              <Link to={{ page: "paquets" }} className="btn btn--gold">
                <LuGift aria-hidden="true" /> Aller aux paquets
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      <Runner
        key={`${today}-${practice}`}
        questions={questions}
        onDone={(score) => recordQuiz(score, questions.length, DAILY_PASS)}
        finalText={(score) =>
          result
            ? "Partie d'entraînement : elle ne change pas le bonus d'aujourd'hui."
            : score >= DAILY_PASS
              ? "Bravo ! Le paquet bonus est débloqué."
              : "Pas assez pour le bonus aujourd'hui. Relis quelques fiches, et reviens demain."
        }
      />
      {result ? (
        <button type="button" className="btn btn--ghost" onClick={() => setPractice((n) => n + 1)}>
          <LuRotateCcw aria-hidden="true" /> Rejouer pour s'entraîner
        </button>
      ) : null}

      <p className="note">
        Les questions viennent des fiches, des effectifs 2026-2027, des grands matchs et du lexique. Le défi change chaque jour.{" "}
        <Link to={{ page: "grand-defi" }}>Le grand défi en 10 questions</Link>
      </p>
    </div>
  );
}

export function GrandDefi({ album }: { album: Album }) {
  const state = useStore();
  const [round, setRound] = useState(0);
  const questions = useMemo<Question[]>(() => album.quiz.map((q: QuizQuestion) => ({ ...q })), [album]);
  return (
    <div>
      <PageTitle kicker="Le grand défi" title="Dix questions, zéro piège tordu.">
        <p>Les réponses sont dans les fiches. Si tu te trompes, l'explication dit pourquoi. Meilleur score sur cet appareil : {state.quizBest}/10.</p>
      </PageTitle>
      <Runner
        key={round}
        questions={questions}
        onDone={(score) => recordBigQuiz(score)}
        finalText={(score) => (score >= 8 ? "Tu peux raconter ces matchs à table." : "Rouvre deux fiches, puis reviens. L'album sert à ça.")}
      />
      <button type="button" className="btn btn--ghost" onClick={() => setRound((r) => r + 1)}>
        <LuRotateCcw aria-hidden="true" /> Recommencer
      </button>
    </div>
  );
}
