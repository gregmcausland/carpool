
export function Firebase({ onChange, onLoad = () => {} }) {

    const config = {
        apiKey: "AIzaSyAN_sn9RVCy55m6LipHi7565C4DCOZPgqQ",
        authDomain: "hackday-60046.firebaseapp.com",
        databaseURL: "https://hackday-60046.firebaseio.com",
        storageBucket: "hackday-60046.appspot.com",
        messagingSenderId: "18827712810"
    };

    const db = window.firebase.initializeApp(config);
    const root = db.database().ref('people');

    root.on('value', snap => {
        const res = snap.val();
        onChange({ res });
    }, err => {
        onChange({ err });
    });

    root.once('value', snap => onLoad({ res: snap.val() }));

    return { updateUser }

    function updateUser({ userIndex, payload }) {
        root.child(`${userIndex}`).set({ ...payload });
    }
}