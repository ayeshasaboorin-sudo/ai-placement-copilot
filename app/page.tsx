
"use client";

import { useState } from "react";

type Question = {
  question: string;
  reason: string;
  answerGuidance: string;
};

type InterviewQuestions = {
  technical: Question[];
  project: Question[];
  behavioral: Question[];
};

type Personalization = {
  matchedSkills?: string[];
  resumeSkills?: string[];
  jobSkills?: string[];
  projectEvidenceFound?: number;
};

type ApiResponse = {
  text?: string;
  resumeText?: string;
  extractedText?: string;
  filename?: string;
  questions?: InterviewQuestions;
  technical?: Question[];
  project?: Question[];
  behavioral?: Question[];
  personalization?: Personalization;
  error?: string;
  details?: string;
};

async function readApiResponse(
  response: Response
): Promise<ApiResponse> {
  const responseText = await response.text();

  if (!responseText.trim()) {
    throw new Error(
      `The server returned an empty response (HTTP ${response.status}). Check the Next.js terminal for errors.`
    );
  }

  try {
    return JSON.parse(responseText) as ApiResponse;
  } catch {
    throw new Error(
      `The server returned an invalid response (HTTP ${response.status}). Check the Next.js terminal for errors.`
    );
  }
}

export default function Home() {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [targetRole, setTargetRole] = useState("Software Engineer");
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [questions, setQuestions] =
    useState<InterviewQuestions | null>(null);
  const [skillAnalysis, setSkillAnalysis] =
    useState<Personalization | null>(null);
  const [activeTab, setActiveTab] =
    useState<"technical" | "project" | "behavioral">("technical");

  async function handleResumeUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedExtensions = [".pdf", ".docx", ".txt"];
    const validFile = allowedExtensions.some((extension) =>
      file.name.toLowerCase().endsWith(extension)
    );

    if (!validFile) {
      setError("Please upload a PDF, DOCX, or TXT resume.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Your resume must be smaller than 5 MB.");
      event.target.value = "";
      return;
    }

    if (file.size === 0) {
      setError("The selected file is empty.");
      event.target.value = "";
      return;
    }

    setUploading(true);
    setError("");
    setResumeText("");
    setFileName("");
    setQuestions(null);
    setSkillAnalysis(null);

    try {
      const formData = new FormData();
      formData.append("resume", file);

      const response = await fetch("/api/extract-resume", {
        method: "POST",
        body: formData,
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          [data.error, data.details].filter(Boolean).join(" — ") ||
            `Resume upload failed (HTTP ${response.status}).`
        );
      }

      const extractedText =
        data.text ?? data.resumeText ?? data.extractedText ?? "";

      if (!extractedText.trim()) {
        throw new Error(
          "The server did not return readable resume text. Try another file."
        );
      }

      setResumeText(extractedText);
      setFileName(file.name);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Resume upload failed."
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function generateQuestions() {
    setError("");
    setQuestions(null);
    setSkillAnalysis(null);

    if (!resumeText.trim()) {
      setError("Please upload your resume first.");
      return;
    }

    if (!targetRole.trim()) {
      setError("Please enter your target role.");
      return;
    }

    if (!jobDescription.trim()) {
      setError("Please enter the job description.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeText,
          jobDescription,
          targetRole,
        }),
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          [data.error, data.details].filter(Boolean).join(" — ") ||
            `Question generation failed (HTTP ${response.status}).`
        );
      }

      const result = data.questions ?? data;

      const generated: InterviewQuestions = {
        technical: Array.isArray(result.technical)
          ? result.technical
          : [],
        project: Array.isArray(result.project)
          ? result.project
          : [],
        behavioral: Array.isArray(result.behavioral)
          ? result.behavioral
          : [],
      };

      const totalQuestions =
        generated.technical.length +
        generated.project.length +
        generated.behavioral.length;

      if (totalQuestions === 0) {
        throw new Error(
          "The server returned no interview questions. Check the generate-questions API route."
        );
      }

      setQuestions(generated);
      setSkillAnalysis(data.personalization ?? null);

      setActiveTab(
        generated.technical.length > 0
          ? "technical"
          : generated.project.length > 0
            ? "project"
            : "behavioral"
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not generate interview questions."
      );
    } finally {
      setLoading(false);
    }
  }

  const tabs = [
    {
      id: "technical" as const,
      label: "Technical",
      icon: "💻",
    },
    {
      id: "project" as const,
      label: "Projects",
      icon: "🚀",
    },
    {
      id: "behavioral" as const,
      label: "Behavioral",
      icon: "💬",
    },
  ];

  const visibleQuestions = questions?.[activeTab] ?? [];

  const matchedSkills = skillAnalysis?.matchedSkills ?? [];
  const resumeSkills = skillAnalysis?.resumeSkills ?? [];
  const jobSkills = skillAnalysis?.jobSkills ?? [];

  const detectedResumeSkills = new Set(
    resumeSkills.map((skill) => skill.toLowerCase())
  );

  const notDetectedSkills = jobSkills.filter(
    (skill) => !detectedResumeSkills.has(skill.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-sky-50 text-slate-800">
      <header className="sticky top-0 z-20 border-b border-violet-100 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-lg font-bold text-white shadow-lg shadow-violet-200">
              AI
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
                Placement <span className="text-violet-600">Copilot</span>
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">
                Your personal career companion
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Interview Prep
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="relative mb-10 overflow-hidden rounded-3xl border border-violet-100 bg-white/80 p-6 shadow-xl shadow-violet-100/50 sm:p-10">
          <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-violet-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 right-1/3 h-48 w-48 rounded-full bg-sky-200/40 blur-3xl" />

          <div className="relative">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3.5 py-2 text-xs font-bold text-violet-700">
              <span>✨</span>
              YOUR NEXT OPPORTUNITY STARTS HERE
            </div>

            <h2 className="max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              Your dream job is closer than you think.
              <span className="mt-1 block bg-gradient-to-r from-violet-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">
                Let&apos;s get you interview-ready.
              </span>
            </h2>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              Bring your resume and a job description. We&apos;ll help you
              prepare with personalized technical, project, and behavioral
              interview questions.
            </p>

            <div className="mt-7 flex flex-wrap gap-3 text-xs font-semibold sm:text-sm">
              <span className="rounded-full bg-violet-100 px-4 py-2 text-violet-700">
                🎯 Personalized practice
              </span>
              <span className="rounded-full bg-sky-100 px-4 py-2 text-sky-700">
                💡 Guided answers
              </span>
              <span className="rounded-full bg-amber-100 px-4 py-2 text-amber-700">
                🌱 Grow your confidence
              </span>
            </div>
          </div>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8">
          <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-xl shadow-violet-100/50 sm:p-7">
            <div className="mb-7 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-2xl">
                🧑‍🎓
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  Your career profile
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  A few details help us tailor your practice.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label
                  htmlFor="resume"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  01. Upload your resume
                </label>

                <label
                  htmlFor="resume"
                  className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-violet-200 bg-gradient-to-br from-violet-50/80 to-sky-50/80 px-4 py-8 text-center transition duration-200 hover:border-violet-400 hover:bg-violet-50"
                >
                  <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-md shadow-violet-100 transition group-hover:-translate-y-1">
                    {uploading ? "⏳" : "📄"}
                  </span>

                  <span className="max-w-full break-all text-sm font-bold text-slate-800">
                    {uploading
                      ? "Extracting resume text..."
                      : fileName || "Click here to upload your resume"}
                  </span>

                  <span className="mt-2 text-xs text-slate-500">
                    PDF, DOCX, or TXT · Maximum 5 MB
                  </span>

                  {resumeText && !uploading && (
                    <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
                      <span>✓</span>
                      Resume uploaded successfully
                    </span>
                  )}
                </label>

                <input
                  id="resume"
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleResumeUpload}
                  disabled={uploading}
                  className="sr-only"
                />
              </div>

              <div>
                <label
                  htmlFor="targetRole"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  02. Target role
                </label>
                <input
                  id="targetRole"
                  type="text"
                  value={targetRole}
                  onChange={(event) => setTargetRole(event.target.value)}
                  placeholder="e.g. Software Engineer"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <div>
                <label
                  htmlFor="jobDescription"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  03. Job description
                </label>
                <textarea
                  id="jobDescription"
                  value={jobDescription}
                  onChange={(event) => setJobDescription(event.target.value)}
                  placeholder="Paste the job description here..."
                  rows={7}
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Tip: Include the role requirements and skills from the job
                  listing.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="break-words rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700"
                >
                  <span className="mr-2">⚠️</span>
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={generateQuestions}
                disabled={loading || uploading}
                className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-violet-200 transition duration-200 hover:-translate-y-0.5 hover:from-violet-700 hover:to-indigo-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {loading
                  ? "✨ Preparing your questions..."
                  : "Generate my interview plan →"}
              </button>

              <p className="text-center text-xs leading-5 text-slate-400">
                Made to help you practice with more confidence ✦
              </p>
            </div>
          </section>

          <section className="min-w-0 rounded-3xl border border-sky-100 bg-white p-5 shadow-xl shadow-sky-100/50 sm:p-7">
            <div className="mb-7 flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-2xl">
                  💡
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    Your interview lab
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Your personalized practice questions appear here.
                  </p>
                </div>
              </div>

              {questions && (
                <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
                  ✓ Ready to practice
                </span>
              )}
            </div>

            {!questions ? (
              <div className="flex min-h-[380px] flex-col items-center justify-center rounded-2xl border border-dashed border-violet-200 bg-gradient-to-br from-violet-50/70 via-white to-sky-50/70 px-6 py-10 text-center">
                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-100 to-sky-100 text-4xl shadow-sm">
                  🚀
                </div>
                <h4 className="text-lg font-extrabold text-slate-900">
                  Your next chapter starts here
                </h4>
                <p className="mt-3 max-w-sm text-sm leading-7 text-slate-500">
                  Complete your profile to unlock practice questions shaped
                  around your experience, projects, and target job.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <span className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-violet-700 shadow-sm">
                    💻 Technical
                  </span>
                  <span className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-sky-700 shadow-sm">
                    🚀 Projects
                  </span>
                  <span className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-amber-700 shadow-sm">
                    💬 Behavioral
                  </span>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex flex-col items-center gap-2 rounded-xl px-2 py-3 text-xs font-bold transition sm:flex-row sm:justify-center sm:gap-2 sm:text-sm ${
                        activeTab === tab.id
                          ? "bg-white text-violet-700 shadow-sm ring-1 ring-violet-100"
                          : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] sm:text-xs ${
                          activeTab === tab.id
                            ? "bg-violet-100 text-violet-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {questions[tab.id].length}
                      </span>
                    </button>
                  ))}
                </div>

                {visibleQuestions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center">
                    <div className="mb-3 text-3xl">🌱</div>
                    <p className="text-sm font-semibold text-slate-700">
                      No questions in this category yet
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Try another tab to explore your practice questions.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {visibleQuestions.map((item, index) => (
                      <article
                        key={`${activeTab}-${index}`}
                        className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
                      >
                        <div className="mb-4 flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 text-sm font-extrabold text-violet-700">
                            {index + 1}
                          </span>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            {activeTab === "technical"
                              ? "Technical question"
                              : activeTab === "project"
                                ? "Project question"
                                : "Behavioral question"}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold leading-7 text-slate-900 sm:text-base">
                          {item.question}
                        </h4>

                        {item.reason && (
                          <div className="mt-5 rounded-xl bg-violet-50/80 p-4">
                            <p className="mb-2 text-xs font-extrabold uppercase tracking-wider text-violet-700">
                              🎯 Why this question?
                            </p>
                            <p className="text-sm leading-6 text-slate-600">
                              {item.reason}
                            </p>
                          </div>
                        )}

                        {item.answerGuidance && (
                          <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/80 p-4">
                            <p className="mb-2 text-xs font-extrabold uppercase tracking-wider text-emerald-700">
                              🌟 Answer guidance
                            </p>
                            <p className="text-sm leading-6 text-slate-700">
                              {item.answerGuidance}
                            </p>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        {skillAnalysis && (
          <section className="mt-8 rounded-3xl border border-violet-100 bg-white p-5 shadow-xl shadow-violet-100/40 sm:p-7">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">
                📊
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  Resume–Job Skill Match
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Compare skills detected in your resume with those mentioned
                  in the job description.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
                <h4 className="font-bold text-emerald-800">
                  ✓ Matched skills ({matchedSkills.length})
                </h4>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Skills detected in both your resume and the job description.
                </p>

                {matchedSkills.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {matchedSkills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-600">
                    No shared skills were detected. Try checking the resume
                    text and job description.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5">
                <h4 className="font-bold text-amber-800">
                  ◇ Skills not detected in resume ({notDetectedSkills.length})
                </h4>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Job-related skills that were not detected in the extracted
                  resume text. This does not necessarily mean you lack them.
                </p>

                {notDetectedSkills.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {notDetectedSkills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-600">
                    No additional job skills from the detected list were found
                    to highlight.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-violet-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-violet-700">
                  Resume skills detected
                </p>
                <p className="mt-2 text-2xl font-extrabold text-slate-900">
                  {resumeSkills.length}
                </p>
              </div>

              <div className="rounded-2xl bg-sky-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-sky-700">
                  Project evidence found
                </p>
                <p className="mt-2 text-2xl font-extrabold text-slate-900">
                  {skillAnalysis.projectEvidenceFound ?? 0}
                </p>
              </div>
            </div>
          </section>
        )}

        <footer className="mt-12 border-t border-violet-100 py-6 text-center">
          <p className="text-sm font-bold text-slate-700">
            Placement Copilot <span className="text-violet-600">✓</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Prepare smarter. Practice with purpose. Interview with confidence.
          </p>
        </footer>
      </section>
    </main>
  );
}