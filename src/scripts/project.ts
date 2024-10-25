
// a project has a title and a description
// cover image is a must
// tech stack is a must
// optional web, play, github, design, video link
// platform, can be app or website or both
//type project can be personal, group, internship, freelance, open source, for a client (contract) among others

export class Project {
    title: string;
    description: string;
    cover_image: string;
    tech_stack: string[];
    platform: string[];
    project_type: string[];

    // span
    span?: string;

    // app links
    web_link?: string;
    play_link?: string;
    github_url?: string;
    design_link?: string;
    video_url?: string;

    constructor({
        title,
        description,
        cover_image,
        tech_stack = [],
        platform = [],
        project_type = [],
        span,
        web_link,
        play_link,
        github_url,
        design_link,
        video_url
    }: {
        title: string;
        description: string;
        tech_stack: string[];
        platform: string[];
        project_type: string[];

        cover_image?: string;

        span?: string;

        web_link?: string;
        play_link?: string;
        github_url?: string;
        design_link?: string;
        video_url?: string;
    }) {
        this.title = title;
        this.description = description;
        this.cover_image = cover_image;
        this.tech_stack = tech_stack;
        this.platform = platform;
        this.project_type = project_type;

        this.span = span;

        this.web_link = web_link;
        this.play_link = play_link;
        this.github_url = github_url;
        this.design_link = design_link;
        this.video_url = video_url;
    }
}


//* boolean checks for the presence of links
export function projContainsWeb(project: Project): boolean {
    return project.web_link !== undefined && project.web_link != null;
}

export function projContainsPlay(project: Project): boolean {
    return project.play_link !== undefined && project.play_link != null;
}

export function projContainsGithub(project: Project): boolean {
    return project.github_url !== undefined && project.github_url != null;
}

export function projContainsDesign(project: Project): boolean {
    return project.design_link !== undefined && project.design_link != null;
}

export function projContainsVideo(project: Project): boolean {
    return project.video_url !== undefined && project.video_url != null;
}

// has span
export function projHasSpan(project: Project): boolean {
    return project.span !== undefined && project.span != null;
}

// has image
export function projHasImage(project: Project): boolean {
    return project.span !== undefined && project.cover_image != null;
}