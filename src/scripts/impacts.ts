export interface Impact {
    // title
    title: string;
    numbers: string;
    sub_title: string;
    col_span?: string;
    link?:string;
}


export const impacts: Impact[] = [
    {
        title: "Overall",
        numbers: "10K+",
        col_span: "md:col-span-2",
        sub_title: "Developers Impacted",
    },

    // stack overflow
    {
        title: "StackOverflow",
        numbers: "~3K+",
        sub_title: "Answer Views Reached",
    },

    // talks
    {
        title: "Dev. Talks",
        numbers: "5",
        sub_title: "Event Sessions (580+ Attendees)",
    },

    // 
    {
        title: "Trainings",
        numbers: "2",
        sub_title: "Flutter Traings (120+ Learners)",
    },

    // open source
    {
        title: "Open Source",
        numbers: "1",
        sub_title: "Project (Lifetime 7.8K+ users)",
    },

];