
import AppRoutes from "./routes/AppRoutes"
import { StageProvider } from "./context/StageContext"
import { CharacterProvider } from "./context/CharacterContext"

function App() {

  return(
    <>
    <StageProvider initial="idle">
      <CharacterProvider>
        <AppRoutes/>
      </CharacterProvider>
    </StageProvider> 
    </>
  )

}

export default App
