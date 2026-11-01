// TEMPORARY — a local look at the three new screens without a session.
// Delete this folder once the visual check is done.

import RoleChoice from "../../_account/RoleChoice";
import SeekerOnboarding from "../../_account/SeekerOnboarding";
import PublicProfileView from "../../_account/seeker/PublicProfileView";
import SeekerHome from "../../_account/seeker/SeekerHome";
import SeekerShell from "../../_account/seeker/SeekerShell";
import { emptyProfile } from "@/lib/seeker-profile";

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view = "choice" } = await searchParams;
  const email = "aadil@example.com";

  if (view === "home") {
    // The shell needs no session of its own — only a viewer to print. The
    // sign-out button inside it would act on the real session, so this
    // preview is for looking, not for using.
    //
    // The feed is a fixed sample rather than a database read: this route
    // exists to check the card, the composer and the rails without a
    // session, and a sample keeps it independent of who happens to be
    // seeded in the workspace.
    const viewer = {
      id: "preview-viewer",
      firstName: "Aadil",
      lastName: "Hussain",
      email,
      username: "aadil",
      headline: "Founder @RecruitAI | Building Web Services",
      location: "Raipur, India",
      percent: 100,
    };

    const me = {
      id: viewer.id,
      name: "Aadil Hussain",
      username: viewer.username,
      headline: viewer.headline,
      following: false,
    };

    const them = {
      id: "preview-author",
      name: "Nikhil Verma",
      username: "nikhil",
      headline: "Backend engineer · Node, Postgres, queues",
      following: false,
      photo: null,
      city: "Raipur",
      mutual: 2,
    };

    return (
      <SeekerShell
        viewer={{
          firstName: viewer.firstName,
          lastName: viewer.lastName,
          username: viewer.username,
          email,
          photo: null,
        }}
      >
        <SeekerHome
          viewer={viewer}
          feed={{
            cursor: null,
            posts: [
              {
                id: "preview-post-1",
                author: me,
                body:
                  "Shipped the composer today. Three thousand characters, one photo, drafts that survive a refresh, and Ctrl + Enter to publish.\n\n#buildinpublic",
                image: null,
                video: null,
                audience: "anyone",
                created: Date.now() - 12 * 60 * 1000,
                edited: false,
                mine: true,
                likes: 4,
                comments: 2,
                reposts: 1,
                liked: false,
                reaction: null,
                saved: false,
                quote: null,
                preview: [
                  {
                    id: "preview-comment-1",
                    author: them,
                    body: "The draft restore is the part nobody builds. Nice.",
                    created: Date.now() - 6 * 60 * 1000,
                    mine: false,
                  },
                ],
                mentions: [],
              },
              {
                id: "preview-post-2",
                author: them,
                body:
                  "Looking for one more frontend collaborator on a small product team. React and TypeScript, remote-first, four-day weeks. Reply here and I will send the brief.",
                image: null,
                video: null,
                audience: "followers",
                created: Date.now() - 3 * 60 * 60 * 1000,
                edited: false,
                mine: false,
                likes: 11,
                comments: 3,
                reposts: 0,
                liked: true,
                reaction: "like",
                saved: true,
                quote: null,
                preview: [],
                mentions: [],
              },
            ],
          }}
          activity={{ posts: 1, reactions: 4, comments: 2, followers: 12 }}
          suggestions={[them]}
        />
      </SeekerShell>
    );
  }

  if (view === "profile") {
    const viewer = {
      id: "preview-viewer",
      firstName: "Aadil",
      lastName: "Hussain",
      username: "aadil",
      headline: "Founder @RecruitAI | Building Web Services",
    };

    return (
      <SeekerShell
        viewer={{
          firstName: viewer.firstName,
          lastName: viewer.lastName,
          username: viewer.username,
          email,
          photo: null,
        }}
      >
        <PublicProfileView
          viewer={{ ...viewer, email }}
          posts={[]}
          profile={{
            person: {
              id: "preview-person",
              name: "HARSHVARDHAN Yadav",
              username: "harsh024",
              headline: "Backend Developer | Spring Boot | Java",
              photo: null,
              city: "raipur",
              mutual: 0,
            },
            cover: null,
            state: "none",
            following: false,
            locked: true,
            counts: { connections: 0, followers: 0, posts: 0 },
            mutual: [],
            about: "",
            experience: [],
            education: [],
            skills: [],
            links: { website: "", linkedin: "", github: "" },
          }}
        />
      </SeekerShell>
    );
  }

  if (view === "onboarding") {
    const profile = {
      ...emptyProfile(),
      firstName: "Aadil",
      lastName: "Hussain",
      username: "aadilh",
      city: "Raipur",
      country: "India",
      headline: "Frontend developer · Building accessible experiences",
      about:
        "I build interfaces that stay out of the way. Currently learning how design systems scale.",
      education: [
        {
          course: "B.Tech",
          speciality: "Computer Science",
          college: "SSIPMT, Raipur",
          current: false,
          startYear: "2020",
          endYear: "2024",
          grade: "8.4 CGPA",
        },
      ],
      skills: [
        { name: "React", level: "Advanced" as const },
        { name: "TypeScript", level: "Intermediate" as const },
      ],
      experience: [],
      experienceConfirmed: false,
    };

    return <SeekerOnboarding email={email} initialProfile={profile} />;
  }

  return <RoleChoice email={email} />;
}
