import {Configuration} from '../types/Configuration';

const data: Configuration = {
    settings: {
        "locale": "pt-BR",
        "cycleInSeconds": 3600,
        "browserColor": "#FFD602",
        "lightColor": "#1AF1F2"
    },
    profile: {
        title: "sergiocabral.com",
        name: "Sergio Cabral",
        description: "Developer",
        url: "https://sergiocabral.com/",
        sections: [
            {
                name: "fas fa-phone-volume",
                description: "Contatos",
                content: [
                    {
                        name: "The Loop",
                        url: "https://loop.cabral.dev/",
                        icon: "fas fa-infinity"
                    },
                    {
                        name: "Email",
                        url: "mailto:contact@sergiocabral.dev",
                        icon: "far fa-envelope"
                    },
                    {
                        name: "Whatsapp",
                        url: "https://wa.me/5522981842500",
                        icon: "fab fa-whatsapp"
                    },
                    {
                        name: "Telegram",
                        url: "https://t.me/sergiocabral_dev",
                        icon: "fab fa-telegram"
                    },
                    {
                        name: "Discord",
                        url: "https://discord.gg/Fv85jcEEp3",
                        icon: "fab fa-discord"
                    },
                    {
                        name: "Guilded",
                        url: "https://www.guilded.gg/i/VkX8nblk",
                        icon: "fab fa-guilded"
                    }
                ]
            },
            {
                name: "fas fa-globe-americas",
                description: "Redes Sociais",
                content: [
                    {
                        name: "GitHub",
                        url: "https://github.com/sergiocabral",
                        icon: "fab fa-github"
                    },
                    {
                        name: "StackOverflow",
                        url: "https://stackexchange.com/users/1488902/sergio-cabral",
                        icon: "fab fa-stack-overflow"
                    },
                    {
                        name: "LinkedIn",
                        url: "https://www.linkedin.com/in/sergiocabraljr",
                        icon: "fab fa-linkedin"
                    },
                    {
                        name: "Twitch",
                        url: "https://www.twitch.tv/sergiocabral_dev",
                        icon: "fab fa-twitch"
                    },
                    {
                        name: "YouTube",
                        url: "https://www.youtube.com/channel/UCBBmSw69UpBbncKM2Xbw-hQ/videos",
                        icon: "fab fa-youtube-square"
                    },
                    {
                        name: "Instagram",
                        url: "https://www.instagram.com/sergiocabral.dev/",
                        icon: "fab fa-instagram"
                    },
                    {
                        name: "Facebook",
                        url: "https://www.facebook.com/sergiocabraljr",
                        icon: "fab fa-facebook-f"
                    },
                    {
                        name: "Twitter",
                        url: "https://twitter.com/sergiocabraldev",
                        icon: "fab fa-twitter"
                    },
                    {
                        name: "about.me",
                        url: "https://about.me/sergiocabral",
                        icon: "far fa-address-card"
                    }
                ]
            },
            {
                name: "fas fa-cogs",
                description: "Meus Projetos",
                content: [
                    {
                        name: "I Don't Need It",
                        url: "https://idontneedit.org/",
                        icon: "fas fa-money-bill"
                    },
                    {
                        name: "E-Books",
                        url: "https://ebooks.sergiocabral.com/",
                        icon: "fas fa-book"
                    },
                    {
                        name: "Fotografias",
                        url: "https://fotos.sergiocabral.com/",
                        icon: "fas fa-camera-retro"
                    },
                    {
                        name: "Git Playground",
                        url: "https://git.sergiocabral.com/",
                        icon: "fab fa-git"
                    },
                    {
                        name: "Loto Number",
                        url: "https://sorteios.sergiocabral.com/",
                        icon: "fas fa-sort-numeric-down"
                    },
                    {
                        name: "Read Quickly",
                        url: "https://quickly.sergiocabral.com/",
                        icon: "fas fa-glasses"
                    }
                ]
            },
            {
                name: "fas fa-id-card",
                description: "Quem Sou Eu?",
                content: `
                    <p>
                        🍕 Não me lembro bem quando comecei a me aventurar
                        com códigos e programação, 👶 talvez nos meus 13 anos.
                        Mas hoje tenho 41? 👨‍🦳
                    </p>
                    <p>
                        🏁 Hoje em dia trabalho como <b>desenvolvedor sênior
                        full stack</b> 😎 lidando com C#, SQL, JavaScript e TypeScript.
                    </p>
                    <p>
                        👽 Mas você me encontra <b>de segunda a sexta na Twitch</b> 📺,
                        quando faço live coding com um assunto pra cada dia.
                    </p>
                `
            }
        ]
    }
};

export default data;
