import React from "react";
import FirstScroll from "./FirstScroll";
import SecondScroll from "./SecondScroll";
import ThirdScroll from "./ThirdScroll";
import '../.././src/App.css'


function Landing(){
    return(
        <div>
            <FirstScroll/>
            <ThirdScroll/>
        </div>
    )
}

export default Landing