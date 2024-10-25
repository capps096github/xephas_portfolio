import { Project } from "./project";

let calcut = new Project({
    title: "Calcut | Calculate Cut-Off Points & Get Course Suggestions",
    description: "Calcut is a Free Fully-fledged Intuitive, Seamless and Efficient Cross-Platform App, trusted by Hundreds of Students in Uganda to Calculate their CutOff Points (Academic Weights) in a matter of split seconds and discover the possible courses they can enrol for at the University, based on the subjects they offered while at their Advanced Level (A’level) in High school.",
    cover_image: "https://raw.githubusercontent.com/capps096github/AppsArt/master/calcut_art/calcut_plus/calcut_cover_24.webp",
    tech_stack: ["Flutter", "Firebase (Backend)", "Express.js (Backend)", "Google Cloud Platform"],
    platform: ["Android", "Web"],
    project_type: ["Personal",],
    web_link: "https://calcut.app",
    play_link: "https://visit.calcut.app/playstore",
    video_url: "https://ggl.link/calcut-demo",
});

// kalya courts web app
let kalyaCourtsWebApp = new Project({
    title: "Kalya Courts Hotel (Demo)",
    description: "Explore Kalya Courts Hotel Fort-Portal, Uganda.The Most Preferred Hotel Destination in Uganda that offers the Best, Memorable and Unforgettable Experiences to all its Visitors.",
    cover_image: "images/kalya_screens.png",
    tech_stack: ["Flutter (For Web)", "Firebase (Backend)"],
    platform: ["Web"],
    span: "md:col-span-2",
    project_type: ["Personal","Learning"],
    web_link: "https://kalyacourts.web.app",
});


// cupertino gallery
let cupertinoIcons = new Project({
    title: "Cupertino Icons Gallery (Used by 7.8K+ Developers)",
    description: "An Open-Source Home of over 1,335 Flutter Cupertino Icons used by over 7.8K Flutter Developers around the World. Similar to the Material Icons Library Available as a Web App and also as an Android App",
    cover_image: "images/cupertino.webp",
    tech_stack: ["Flutter (For Web)", "Firebase Hosting & Backend"],
    platform: ["Web", "Android"],
    project_type: ["Open Source", "Flutter Project"],
    // span: "md:col-span-2",
    web_link: "https://cupertino-icons.web.app/",
    play_link: "https://play.google.com/store/apps/details?id=com.capps096apps.cupertino_icons_gallery",
    github_url: "https://share.xephas.me/cupertino",
});

// thumbs app
let thumbsapp = new Project({
    title: "Thumbs App",
    description: "A video Streaming Platform",
    cover_image: "images/thumbs.webp",
    tech_stack: ["Flutter (For Web)", "Firebase Storage, Hosting & Database"],
    platform: ["Web", "Android"],
    project_type: ["Closed Source", "Flutter Project"],
    web_link: "https://thumbsapp.page.link/test",
});

// flutter community dashboard
let flutterDashboard = new Project({
    title: "Flutter Community Dashboard App",
    description: "Built during my Participation In Dart Google Summer Of Code (Open Source)",
    tech_stack: ["Flutter (For Web)", "Firebase Hosting & Database", "Github API"],
    platform: ["Web"],
    cover_image: "images/flutter_comm.webp",
    project_type: ["Open Source", "Flutter Project"],
    web_link: "https://fluttercommdashboard.web.app/",
});

/// flutter projects
export const flutterList: Project[] = [
    calcut,
    kalyaCourtsWebApp,
    cupertinoIcons,
    thumbsapp,
    flutterDashboard,
];

/// web and design projects, separate, headers can be deep linkd

/*

 <li>
        <InlineLink
          target="_blank"
          ,
          href="https://xephas.me/"
          ,
          text="My Portfolio (This one your on):"
        /> Developed using <InlineLink
          target="_blank"
          ,
          href="https://astro.build/"
          ,
          text="Astro"
        />and <InlineLink
          target="_blank"
          ,
          href="https://tailwindcss.com/"
          ,
          text="Tailwind CSS."
        />It showcases my skills and experiences in a visually appealing and
        user-friendly manner.
      </li>
      <!-- kalya -->
      <li>
        <InlineLink
          target="_blank"
          ,
          href="https://kalyacourtsmenu.web.app/"
          ,
          text="Kalya Courts Hotel Menu:"
        /> Leveraging <InlineLink
          target="_blank"
          ,
          href="https://tailwindcss.com/"
          ,
          text="Tailwind CSS"
        />, I created a sleek and intuitive menu interface for Kalya Courts
        Hotel, Maguru-Itara Road, Fort-Portal, Uganda.
      </li>

      <!--  -->
      <li>
        <InlineLink
          target="_blank"
          href="https://github.com/capps096github/cake_me"
          ,
          text="CakeMe Website:"
        />I collaborated on using <InlineLink
          target="_blank"
          ,
          href="https://www.djangoproject.com/"
          ,
          text="Django"
        /> and <InlineLink
          target="_blank"
          ,
          href="https://tailwindcss.com/"
          ,
          text="Tailwind CSS"
        />, to design and develop a dynamic website for a cake shop, enabling
        seamless online ordering and browsing.
      </li>
      <!--  -->
      <li>
        <InlineLink
          target="_blank"
          href="https://github.com/capps096github/nois_results_complaint_management_system"
          ,
          text="Nois Result Complaint System"
        /> This project involved the creation of a robust complaint management
        system using cutting-edge technologies <strong
          >(PHP and Tailwind CSS)</strong
        > to streamline the resolution process for educational institutions.
      </li>

      <!--  -->
      <li>
        <InlineLink
          target="_blank"
          href="https://github.com/capps096github/kindercare"
          ,
          text="KinderCare School System"
        /> Leveraging PHP, C, and Tailwind CSS, I contributed to the development
        of a comprehensive school management system, facilitating efficient administration
        and communication within a given educational institution.
      </li>
    </div>
*/

// portfolio
let portfolio = new Project({
    title: "My Portfolio",
    description: "Developed using Astro and Tailwind CSS. It showcases my skills and experiences in a visually appealing and user-friendly manner.",
    cover_image: "images/cover.webp",
    tech_stack: ["Astro", "Tailwind CSS"],
    platform: ["Web"],
    project_type: ["Personal"],
    web_link: "https://xephas.me",
});

// kalya courts menu
let kalyaCourtsMenu = new Project({
    title: "Kalya Courts Hotel Menu",
    description: "Leveraging Tailwind CSS, I created a sleek and intuitive menu interface for Kalya Courts Hotel, Maguru-Itara Road, Fort-Portal, Uganda.",
    cover_image: "images/kalya_menu.png",
    tech_stack: ["Tailwind CSS"],
    platform: ["Web"],
    project_type: ["Personal"],
    web_link: "https://kalyacourtsmenu.web.app",
});

// weblist
let cakeMe = new Project({
    title: "CakeMe Website",
    description: "A dynamic website for a cake shop, enabling seamless online ordering and browsing.",
    cover_image: "images/cakeme.webp",
    tech_stack: ["Django (Python)", "Tailwind CSS"],
    platform: ["Web"],
    project_type: ["Open Source", "Web Project"],
    github_url: "https://github.com/capps096github/cake_me",
});

// nois results complaint system
let noisResults = new Project({
    title: "Nois Result Complaint System",
    description: "A robust complaint management system using cutting-edge technologies (PHP and Tailwind CSS) to streamline the resolution process for educational institutions.",
    cover_image: "images/nois.png",
    tech_stack: ["PHP", "Tailwind CSS"],
    platform: ["Web"],
    project_type: ["Open Source", "Web Project"],
    github_url: "https://github.com/capps096github/nois_results_complaint_management_system",
});

// kindercare school system
let kinderCare = new Project({
    title: "KinderCare School System",
    description: "A comprehensive school management system, facilitating efficient administration and communication within a given educational institution.",
    cover_image: "images/kinder.png",
    tech_stack: ["PHP", "C", "Tailwind CSS"],
    platform: ["Web"],
    project_type: ["Open Source", "Web Project"],
    github_url: "https://github.com/capps096github/kindercare",
});

// web projects
export const webList: Project[] = [
    portfolio,
    kalyaCourtsMenu,
    cakeMe,
    noisResults,
    kinderCare,
];