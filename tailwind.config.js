/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {},
    },
    plugins: [
        function ({addUtilities}) {
            const newUtilities = {
                ".scrollbar-thin": {
                    scrollbarWidth: "thin",
                    scrollbarColor: "rgb(31 29 29) white",
                    borderRadius: "50px",
                },
                ".scrollbar-thin-report": {
                    scrollbarWidth: "thin",
                    scrollbarColor: "rgb(31 29 29) white",
                    borderRadius: "25px",
                },
                ".scrollbar-html-thin": {
                    scrollbarWidth: "thin",
                    scrollbarColor: "rgb(192 192 192) white",
                    borderRadius: "50px",
                },
                ".scrollbar-webkit": {
                    "&::-webkit-scrollbar": {
                        width: "4px"
                    },
                    "&::-webkit-scrollbar-track": {
                        background: "white"
                    },
                    "&::-webkit-scrollbar-thumb": {
                        background: "rgba(31 41 55)",
                        borderRadius: "50px",
                        border: "0.5px solid white"
                    }
                },
                ".custom-height": {
                    height: "calc(90vh - 5rem)"
                },
                ".loading": {
                    width: "124px",
                    height: "24px",
                    "-webkit-mask":
                        "conic-gradient(from 135deg at top, #0000, #000 .5deg 90deg, #0000 90.5deg) 0 0," +
                        " conic-gradient(from -45deg at bottom, #0000, #000 .5deg 90deg, #0000 90.5deg) 0 100%;",
                    "-webkit-mask-size": "25% 50%",
                    "-webkit-mask-repeat": "repeat-x",
                    background: "linear-gradient(#25b09b 0 0) left/0% 100% no-repeat #ddd",
                    animation: "loader-animation 2s infinite linear",
                },
                ".loading-container": {
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100vh"
                },
                "@keyframes loader-animation": {
                    "100%": {
                        backgroundSize: "100% 100%",
                    },
                },
            }
            addUtilities(newUtilities, ["responsive", "hover"])
        }
    ],
}

