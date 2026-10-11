
import { NextResponse } from "next/server";

type Question = {
  question: string;
  reason: string;
  answerGuidance: string;
};

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function findMatches(text: string, keywords: string[]): string[] {
  const lowerText = text.toLowerCase();

  return keywords.filter((keyword) =>
    lowerText.includes(keyword.toLowerCase())
  );
}

function extractSentences(text: string): string[] {
  return text
    .replace(/\r/g, "\n")
    .split(/[\n.!?]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 25 && part.length <= 350);
}

function makeQuestion(
  question: string,
  reason: string,
  answerGuidance: string
): Question {
  return { question, reason, answerGuidance };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const resumeText =
      typeof body.resumeText === "string" ? body.resumeText.trim() : "";
    const jobDescription =
      typeof body.jobDescription === "string"
        ? body.jobDescription.trim()
        : "";
    const targetRole =
      typeof body.targetRole === "string" ? body.targetRole.trim() : "";

    if (!resumeText || !jobDescription || !targetRole) {
      return NextResponse.json(
        {
          error:
            "Please provide your resume, target role, and job description.",
        },
        { status: 400 }
      );
    }

    if (
      resumeText.length > 12000 ||
      jobDescription.length > 12000 ||
      targetRole.length > 200
    ) {
      return NextResponse.json(
        { error: "The submitted text is too long. Please shorten it." },
        { status: 400 }
      );
    }

    const skills = [
      "JavaScript",
      "TypeScript",
      "Python",
      "Java",
      "C++",
      "React",
      "Next.js",
      "Node.js",
      "HTML",
      "CSS",
      "Tailwind CSS",
      "REST APIs",
      "SQL",
      "MongoDB",
      "PostgreSQL",
      "Git",
      "GitHub",
      "Docker",
      "AWS",
      "Machine Learning",
      "Data Analysis",
      "Pandas",
      "NumPy",
      "Authentication",
      "Testing",
      "Debugging",
      "Data Structures",
      "Algorithms",
    ];

    const resumeSkills = findMatches(resumeText, skills);
    const jobSkills = findMatches(jobDescription, skills);

    const sharedSkills = resumeSkills.filter((skill) =>
      jobSkills.some(
        (jobSkill) => jobSkill.toLowerCase() === skill.toLowerCase()
      )
    );

    const prioritySkills = unique([
      ...sharedSkills,
      ...jobSkills.filter((skill) => !resumeSkills.includes(skill)),
      ...resumeSkills,
    ]);

    const technicalTopics = unique([
  ...sharedSkills,
  ...jobSkills.filter((skill) =>
    resumeText.toLowerCase().includes(skill.toLowerCase())
  ),
  ...resumeSkills,
]).slice(0, 4);
    while (technicalTopics.length < 4) {
      const fallbacks = [
        "problem-solving",
        "software design",
        "testing",
        "debugging",
      ];
      const next = fallbacks.find(
        (topic) => !technicalTopics.includes(topic)
      );
      if (!next) break;
      technicalTopics.push(next);
    }

    const technical: Question[] = technicalTopics.map((topic) => {
      const inResume = resumeSkills.some(
        (skill) => skill.toLowerCase() === topic.toLowerCase()
      );
      const inJob = jobSkills.some(
        (skill) => skill.toLowerCase() === topic.toLowerCase()
      );

      let reason = `This topic is relevant to the ${targetRole} role.`;

      if (inResume && inJob) {
        reason = `${topic} appears in both your resume and the job description, making it a useful area to demonstrate your experience.`;
      } else if (inJob && !inResume) {
        reason = `${topic} is mentioned in the job description but was not detected in your resume. Prepare an honest answer about your familiarity with it.`;
      } else if (inResume) {
        reason = `${topic} appears in your resume. Be ready to explain how you used it and what you learned.`;
      }

      return makeQuestion(
        `How would you use ${topic} in a ${targetRole} role, and what practical example can you give?`,
        reason,
        `Explain the key concepts of ${topic}. Connect your answer to a real example from your experience if you have one. If you have not used it, say so honestly and explain how you would approach learning or applying it.`
      );
    });

    const resumeSentences = extractSentences(resumeText);
    const projectLines = resumeSentences.filter((sentence) =>
      /\b(project|developed|built|created|implemented|designed|application|system|website|platform|model)\b/i.test(
        sentence
      )
    );

    const projectEvidence = unique(projectLines).slice(0, 3);

    const projectQuestions: Question[] = [];

    if (projectEvidence.length > 0) {
      projectEvidence.forEach((evidence, index) => {
        projectQuestions.push(
          makeQuestion(
            `Your resume mentions: "${evidence}". Can you explain your contribution and the technical decisions you made?`,
            "This question is based on a project-related statement detected in your resume.",
            "Explain the problem, your personal contribution, the tools you used, one challenge, and the result. Only claim work you actually completed."
          )
        );
      });
    }

    const projectFallbacks: Question[] = [
      makeQuestion(
        "Which project from your resume best demonstrates your fit for this role, and why?",
        "This connects your practical experience with the target position.",
        "Choose a real project. Explain its purpose, your contribution, the technologies used, and how it relates to the job requirements."
      ),
      makeQuestion(
        "Describe a technical challenge you faced while building a project and how you addressed it.",
        "This explores your practical problem-solving process.",
        "Describe the issue, the steps you took, the solution, and what you learned. Use a real example."
      ),
      makeQuestion(
        `How would you improve one of your projects to better match a ${targetRole} position?`,
        "This explores how you connect your existing work to the target role.",
        "Identify a realistic improvement related to the job description. Explain why it matters and how you would implement and test it."
      ),
    ];

    for (const fallback of projectFallbacks) {
      if (projectQuestions.length >= 3) break;
      projectQuestions.push(fallback);
    }

    const project = projectQuestions.slice(0, 3);

    const behavioral: Question[] = [
      makeQuestion(
        "Tell me about a challenge you faced while learning or building something. How did you handle it?",
        "This explores adaptability and problem-solving.",
        "Use a real example. Explain the situation, your actions, the outcome, and what you learned."
      ),
      makeQuestion(
        "How do you respond when feedback requires you to change your work?",
        "This explores communication, teamwork, and willingness to improve.",
        "Describe how you listen, clarify the feedback, decide what changes are needed, and communicate the result."
      ),
      makeQuestion(
        `Why are you interested in the ${targetRole} role, and which of your skills best match the job description?`,
        sharedSkills.length > 0
          ? `Your resume and the job description share these detected skills: ${sharedSkills.join(", ")}.`
          : "This helps you connect your experience and interests to the role requirements.",
        `Choose relevant skills or experiences from your resume. Connect them to specific requirements in the job description and explain how you could contribute to the team.`
      ),
    ];

    return NextResponse.json({
      questions: {
        technical,
        project,
        behavioral,
      },
      source: "local",
      personalization: {
        matchedSkills: sharedSkills,
        resumeSkills,
        jobSkills,
        projectEvidenceFound: projectEvidence.length,
      },
    });
  } catch (error) {
    console.error("Question generation failed:", error);

    return NextResponse.json(
      {
        error:
          "Could not generate questions. Please check the submitted data.",
      },
      { status: 500 }
    );
  }
}