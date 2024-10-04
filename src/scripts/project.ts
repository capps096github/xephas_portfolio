
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
        web_link,
        play_link,
        github_url,
        design_link,
        video_url
    }: {
        title: string;
        description: string;
        cover_image: string;
        tech_stack: string[];
        platform: string[];
        project_type: string[];

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

        this.web_link = web_link;
        this.play_link = play_link;
        this.github_url = github_url;
        this.design_link = design_link;
        this.video_url = video_url;
    }


    //* boolean checks for the presence of links
    containsWeb(): boolean {
        return this.web_link !== undefined && this.web_link != null;
    }

    containsPlay(): boolean {
        return this.play_link !== undefined && this.play_link != null;
    }

    containsGithub(): boolean {
        return this.github_url !== undefined && this.github_url != null;
    }

    containsDesign(): boolean {
        return this.design_link !== undefined && this.design_link != null;
    }

    containsVideo(): boolean {
        return this.video_url !== undefined && this.video_url != null;
    }

}

//? Example usage
// let proj = new Project("title", "description", "cover_image", "web_link", "play_link", "github_url", "design_link", "video_url");