import Footer from "../components/home/Footer";
import { Chat } from "./ChatV2";

import AnimeBackground from "../components/background/AnimeBack";
import ThinkingIndicator from "../components/public/ThinkingIndicator";
import { useCharacter } from "../context/CharacterContext";

const URL = import.meta.env.VITE_BACKEND_URL;

const Home:React.FC = () => {


    const {setCharacter} = useCharacter();

    return (
        <>

        <Chat/>

        <div >
            <AnimeBackground/>

            <div  >
                <ThinkingIndicator size={200} color="black"  />
            </div>
        </div>


        <div className=" mt-12">
            <Footer/>
        </div>

        
        </>

    )
}

export default Home;