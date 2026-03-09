const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, limit } = require('firebase/firestore');

// Use the same public configuration as the frontend
const firebaseConfig = {
    apiKey: "AIzaSyA5ySkqiSTi19lHTSt8bhFzypfgqVtaSss",
    authDomain: "urbox-1.firebaseapp.com",
    projectId: "urbox-1",
    storageBucket: "urbox-1.firebasestorage.app",
    messagingSenderId: "897703212804",
    appId: "1:897703212804:web:37ad9da2d61544c2ce0251",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

exports.getPost = async (req, res) => {
    const slug = req.params.slug;

    if (!slug) {
        return res.status(404).render('post', { error: 'No post slug specified.' });
    }

    try {
        const q = query(collection(db, "blog_posts"), where("slug", "==", slug), limit(1));
        const snap = await getDocs(q);

        if (snap.empty) {
            return res.status(404).render('post', { error: 'We couldn\'t find that post.' });
        }

        const postData = snap.docs[0].data();

        // Format dates and helpers for the template
        const p = {
            ...postData,
            // Convert Firestore timestamp to Date
            publishedAt: postData.publishedAt ? postData.publishedAt.toDate() : null,
            publishedISO: postData.publishedAt ? postData.publishedAt.toDate().toISOString() : "",
            authorInitial: (postData.author || "U").charAt(0).toUpperCase(),
            fullUrl: `https://urbox.ai/blog/${encodeURIComponent(slug)}`
        };

        // Render the EJS template with data
        res.render('post', { post: p, error: null });

    } catch (err) {
        console.error("Error fetching blog post:", err);
        res.status(500).render('post', { error: 'Something went wrong loading this post.' });
    }
};
