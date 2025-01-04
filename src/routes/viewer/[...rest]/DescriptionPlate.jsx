import { Icon } from "@iconify/react";
import React from "react";

const DescriptionPlate = ({ label, icon, isOpen, onClick, children, action }) => {
    return (
        <>
            <div className="flex flex-row items-center justify-between border-y" onClick={onClick}>
                <div className="flex items-center sticky top-0 z-10">
                    <label className="ml-3 text-lg my-2 text-green-400 font-sans font-bold">{label}</label>
                    <Icon icon={icon} width="20" height="20" className="ml-3 text-white" />
                </div>
                <div className="flex mr-5 items-center">
                    {action && <div>{action}</div>}
                    <Icon icon={!isOpen ? "line-md:chevron-small-down" : (label === "Specimens" || label === "Slide label") ? "" : "line-md:chevron-small-up"}
                        width="20" height="20"
                    />
                </div>
            </div>
            {isOpen && (
                <div className="relative">
                    <div className="overflow-auto h-full">{children}</div>
                </div>
            )}

        </>
    );
}

export default DescriptionPlate;
