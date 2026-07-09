import React from 'react';
import { Outlet } from 'react-router';
import Nav from './Components/Nav';
import Footer from './Components/Footer';

const Root = () => {
    return (
        <div>
            <Nav></Nav>
            <Outlet></Outlet>
            <Footer></Footer>
        </div>
    );
};

export default Root;