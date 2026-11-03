import { Route,Routes,Navigate } from "react-router-dom"
import Home from "../pages/Home";
import NavBar from "../components/public/NavBar";

const AppRoutes = () => {
    return(
        <>
        <NavBar/>
        
        <Routes>
            
            <Route path="/" element={<Home/>} />
        </Routes>   
        </>
    )
}
export default AppRoutes;