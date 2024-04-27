// a class for my talks
// it contains parameters for the event_title, cover_image, the date, the location, category, description and the github_url(nullable) slides_url(nullable) and video_url(nullable)
export interface CommunityContribution {
    event_title: string;
    date: string;
    location: string;
    categories: string[];
    description: string;
    cover_image: string;
    // for image positioning as per tailwindcss https://tailwindcss.com/docs/object-position
    img_position?: string;
    github_url?: string;
    slides_url?: string;
    video_url?: string;
    twitter_url?: string;

}

export function containsSlides(comm: CommunityContribution): boolean {
    return comm.slides_url !== undefined && comm.slides_url != null;
}

export function containsVideo(comm: CommunityContribution): boolean {
    return comm.video_url !== undefined && comm.video_url != null;
}

export function containsGithub(comm: CommunityContribution): boolean {
    return comm.github_url !== undefined && comm.github_url != null;
}

export function containsTwitter(comm: CommunityContribution): boolean {
    return comm.twitter_url !== undefined && comm.twitter_url != null;
}


