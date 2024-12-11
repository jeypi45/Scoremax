cimport { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Draggable from "react-draggable";
import Swal from "sweetalert2";
import React, { useEffect, useState, useRef } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "font-awesome/css/font-awesome.min.css";
import DataTable from "react-data-table-component";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPrint } from "@fortawesome/free-solid-svg-icons";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

const FootballTeams = ({
    teams: initialTeams = [],
    auth,
    error,
    successMessage,
}) => {
    const [activeLeague, setActiveLeague] = useState(
        JSON.parse(localStorage.getItem("activeLeague"))
    );

    useEffect(() => {
        // Retrieve the active league on component load or when local storage changes
        const leagueData = JSON.parse(localStorage.getItem("activeLeague"));
        if (leagueData) {
            setActiveLeague(leagueData);
        }
    }, []);
    const [teams, setTeams] = useState(initialTeams); // Local state for teams
    const [teamName, setTeamName] = useState("");
    const [coachName, setCoachName] = useState("");
    const [playerCount, setPlayerCount] = useState("");
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false); // New state for history modal
    const [searchQuery, setSearchQuery] = useState("");
    const [matchScores, setMatchScores] = useState([]); // New state for match scores
    const modalRef = useRef(null);
    const resetForm = () => {
        setTeamName("");
        setCoachName("");
        setPlayerCount("");
        setSelectedTeam(null);
    };

    const openAddTeamModal = () => {
        resetForm();
        setIsModalOpen(true);
    };

    const openEditTeamModal = (team) => {
        setSelectedTeam(team);
        setTeamName(team.TeamName);
        setCoachName(team.CoachName);
        setPlayerCount(team.PlayerCount);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        resetForm();
    };

    const openHistoryModal = () => {
        setIsHistoryModalOpen(true);
        fetchMatchScores(); // Fetch match scores when the modal is opened
    };

    const closeHistoryModal = () => {
        setIsHistoryModalOpen(false);
    };
    useEffect(() => {
        // Retrieve the active league on component load or when local storage changes
        const leagueData = JSON.parse(localStorage.getItem("activeLeague"));
        if (leagueData) {
            setActiveLeague(leagueData);
        }
    }, []);

    const fetchMatchScores = () => {
        if (!activeLeague) {
            setMatchScores([]); // Clear match scores if no active league
            return;
        }

        axios
            .get(`/football_match_score?league_id=${activeLeague.LeagueID}`)
            .then((response) => {
                setMatchScores(response.data);
            })
            .catch(() => {
                toast.error("Error fetching match scores.");
            });
    };

    // Update the scores when the active league changes
    useEffect(() => {
        fetchMatchScores();
    }, [activeLeague]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const userId = auth.user.id;

        const data = {
            TeamName: teamName,
            CoachName: coachName,
            PlayerCount: playerCount,
            user_id: userId,
        };

        if (selectedTeam) {
            // Update Team
            axios
                .put(`/footballteams/${selectedTeam.TeamID}`, data)
                .then((response) => {
                    // Update team in local state
                    setTeams((prevTeams) =>
                        prevTeams.map((team) =>
                            team.TeamID === selectedTeam.TeamID
                                ? { ...team, ...response.data }
                                : team
                        )
                    );
                    Swal.fire({
                        icon: "success",
                        title: "Team Updated!",
                        text: "The team has been updated successfully.",
                    });
                    closeModal();
                })
                .catch((error) => {
                    Swal.fire({
                        icon: "error",
                        title: "Error!",
                        text:
                            error?.response?.data?.message ||
                            "Failed to update the team.",
                    });
                });
        } else {
            // Add Team
            axios
                .post("/footballteams", data)
                .then((response) => {
                    // Add new team to local state
                    setTeams((prevTeams) => [...prevTeams, response.data]);
                    Swal.fire({
                        icon: "success",
                        title: "Team Added!",
                        text: "The team has been added successfully.",
                    });
                    closeModal();
                })
                .catch((error) => {
                    Swal.fire({
                        icon: "error",
                        title: "Error!",
                        text:
                            error?.response?.data?.message ||
                            "Failed to add the team.",
                    });
                });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: "Are you sure?",
            text: "You won't be able to revert this!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, delete it!",
            cancelButtonText: "Cancel",
        }).then((result) => {
            if (result.isConfirmed) {
                axios
                    .delete(`/footballteams/${id}`)
                    .then(() => {
                        // Remove team from local state
                        setTeams((prevTeams) =>
                            prevTeams.filter((team) => team.TeamID !== id)
                        );
                        Swal.fire({
                            icon: "success",
                            title: "Deleted!",
                            text: "The team has been deleted successfully.",
                        });
                    })
                    .catch((error) => {
                        Swal.fire({
                            icon: "error",
                            title: "Error!",
                            text:
                                error?.response?.data?.message ||
                                "Failed to delete the team.",
                        });
                    });
            }
        });
    };

    const filteredMatchScores = matchScores.filter(
        (score) => score.LeagueID === activeLeague?.LeagueID
    );

    const filteredTeams = teams.filter(
        (team) =>
            team.LeagueID === activeLeague?.LeagueID &&
            (team.TeamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                team.CoachName.toLowerCase().includes(
                    searchQuery.toLowerCase()
                ))
    );

    const matchScoreColumns = [
        {
            name: "Team 1 Name",
            selector: (row) => row.Team1Name,
            sortable: true,
        },
        {
            name: "Team 2 Name",
            selector: (row) => row.Team2Name,
            sortable: true,
        },
        {
            name: "Team 1 Score",
            selector: (row) => row.Team1Score,
            sortable: true,
        },
        {
            name: "Team 2 Score",
            selector: (row) => row.Team2Score,
            sortable: true,
        },
        {
            name: "Game Winner", // New column for game winner
            selector: (row) => row.Game_Winner, // Fetch the Game_Winner field
            sortable: true,
        },
        {
            name: "Date",
            selector: (row) => new Date(row.created_at).toLocaleDateString(),
            sortable: true,
        },
    ];

    const columns = [
        {
            name: "ID",
            selector: (row, index) => index + 1,
            sortable: true,
        },
        {
            name: "Team Name",
            selector: (row) => row.TeamName,
            sortable: true,
        },
        {
            name: "Coach Name",
            selector: (row) => row.CoachName,
            sortable: true,
        },
        {
            name: "Player Count",
            selector: (row) => row.PlayerCount,
            sortable: true,
        },
        {
            name: "Actions",
            cell: (row) => (
                <div>
                    <button
                        onClick={() => openEditTeamModal(row)}
                        className="btn btn-warning btn-sm me-2"
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => handleDelete(row.TeamID)}
                        className="btn btn-danger btn-sm"
                    >
                        Delete
                    </button>
                </div>
            ),
        },
    ];
    const exportToExcel = () => {
        const worksheetData = filteredTeams.map((team) => ({
            TeamName: team.TeamName,
            CoachName: team.CoachName,
            PlayerCount: team.PlayerCount,
        }));

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Teams");
        XLSX.writeFile(workbook, "Football_Teams.xlsx");
    };

    const exportMatchDetailsToExcel = () => {
        const matchDetailsData = filteredMatchScores.map((match) => ({
            Team1Name: match.Team1Name,
            Team2Name: match.Team2Name,
            Team1Score: match.Team1Score,
            Team2Score: match.Team2Score,
            Game_Winner: match.Game_Winner,
            created_at: match.created_at,
        }));

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(matchDetailsData);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Match Scores");
        XLSX.writeFile(workbook, "Match_Scores.xlsx");
    };

    const handlePrintTeamsPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Football Teams", 14, 10);

        doc.setFontSize(12);
        doc.autoTable({
            startY: 20,
            head: [["Team Name", "Coach", "Players"]],
            body: filteredTeams.map((team) => [
                team.TeamName,
                team.CoachName,
                team.PlayerCount,
            ]),
            theme: "grid",
        });

        doc.save("FootballTeams.pdf");
    };

    const handlePrintMatchScoresPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Match Scores", 14, 10);

        doc.setFontSize(12);
        doc.autoTable({
            startY: 20,
            head: [["Date", "Home Team", "Away Team", "Score"]],
            body: filteredMatchScores.map((match) => [
                match.Team1Name,
                match.Team2Name,
                match.Team1Score,
                match.Team2Score,
                match.Game_Winner,
            ]),
            theme: "grid",
        });

        doc.save("MatchScores.pdf");
    };

    return (
        <AuthenticatedLayout>
            <div className="container my-4">
                <h1 className="text-center mb-4">Football Teams</h1>

                <button
                    onClick={openAddTeamModal}
                    className="btn btn-success mb-4"
                >
                    Add Team
                </button>

                <button
                    onClick={openHistoryModal} // Open the history modal
                    className="btn btn-info mb-4 ms-2"
                >
                    Match History
                </button>
                <div className="mb-3">
                    <button
                        className="btn btn-secondary mb-3"
                        onClick={exportToExcel}
                    >
                        <FontAwesomeIcon icon={faPrint} className="me-2" />
                        Print Excel
                    </button>
                    <button
                        className="btn btn-secondary mb-3 ms-2 "
                        onClick={handlePrintTeamsPDF}
                    >
                        <FontAwesomeIcon icon={faPrint} className="me-2" />
                        Print PDF
                    </button>
                </div>
                <input
                    type="text"
                    className="form-control mb-4"
                    placeholder="Search Teams or Coaches..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: "300px" }}
                />

                <DataTable
                    title="Teams"
                    columns={columns}
                    data={filteredTeams}
                    pagination
                    highlightOnHover
                    responsive
                    striped
                />

                {isModalOpen && (
                    <div className="modal" style={{ display: "block" }}>
                        <Draggable nodeRef={modalRef} handle=".modal-header">
                            <div className="modal-dialog" ref={modalRef}>
                                <div className="modal-content">
                                    <div className="modal-header">
                                        <h5 className="modal-title">
                                            {selectedTeam
                                                ? "Edit Team"
                                                : "Add Team"}
                                        </h5>
                                        <button
                                            type="button"
                                            className="btn-close"
                                            onClick={closeModal}
                                        ></button>
                                    </div>
                                    <div className="modal-body">
                                        <form onSubmit={handleSubmit}>
                                            <input
                                                type="text"
                                                className="form-control mb-3"
                                                value={teamName}
                                                onChange={(e) =>
                                                    setTeamName(e.target.value)
                                                }
                                                placeholder="Team Name"
                                                required
                                            />
                                            <input
                                                type="text"
                                                className="form-control mb-3"
                                                value={coachName}
                                                onChange={(e) =>
                                                    setCoachName(e.target.value)
                                                }
                                                placeholder="Coach Name"
                                                required
                                            />
                                            <input
                                                type="number"
                                                className="form-control mb-3"
                                                value={playerCount}
                                                onChange={(e) =>
                                                    setPlayerCount(
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="Player Count"
                                                required
                                            />
                                            <button
                                                type="submit"
                                                className="btn btn-primary"
                                            >
                                                {selectedTeam
                                                    ? "Update Team"
                                                    : "Add Team"}
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </Draggable>
                    </div>
                )}

                {isHistoryModalOpen && (
                    <div className="modal" style={{ display: "block" }}>
                        <Draggable nodeRef={modalRef} handle=".modal-header">
                            <div
                                className="modal-dialog"
                                ref={modalRef}
                                style={{ maxWidth: "68%" }}
                            >
                                <div className="modal-content">
                                    <div className="modal-header">
                                        <h5 className="modal-title">
                                            Match History
                                        </h5>
                                        <button
                                            type="button"
                                            className="btn-close"
                                            onClick={closeHistoryModal}
                                        ></button>
                                    </div>
                                    <div className="modal-body">
                                        <div className="mb-3">
                                            <button
                                                className="btn btn-secondary mb-3"
                                                onClick={
                                                    exportMatchDetailsToExcel
                                                }
                                            >
                                                <FontAwesomeIcon
                                                    icon={faPrint}
                                                    className="me-2"
                                                />
                                                Print Excel
                                            </button>
                                            <button
                                                className="btn btn-secondary mb-3 ms-2 "
                                                onClick={
                                                    handlePrintMatchScoresPDF
                                                }
                                            >
                                                <FontAwesomeIcon
                                                    icon={faPrint}
                                                    className="me-2"
                                                />
                                                Print PDF
                                            </button>
                                        </div>
                                        <DataTable
                                            title="Match Scores"
                                            columns={matchScoreColumns}
                                            data={matchScores}
                                            pagination
                                            highlightOnHover
                                            responsive
                                            striped
                                        />
                                    </div>
                                </div>
                            </div>
                        </Draggable>
                    </div>
                )}
            </div>
            <ToastContainer />
        </AuthenticatedLayout>
    );
};

export default FootballTeams;
