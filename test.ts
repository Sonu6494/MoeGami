import { fetchAndNormalise } from "./src/lib/anilist";
import { buildFranchiseGroups } from "./src/lib/grouping";

async function run() {
    const users = ["subito", "hoshimachi", "Biss1099", "Kinofake", "Biss", "josh"];
    for (const u of users) {
        try {
            const data = await fetchAndNormalise(u);
            if (data.length > 200) {
                console.log("----------------------");
                console.log("Found big user", u);
                const groups = buildFranchiseGroups(data);
                console.log(groups.length);
                console.log("----------------------");

                const testFranchises = ['fate', 'one piece', 'shingeki', 'titan', 'soul land'];
                testFranchises.forEach((name) => {
                    const match = groups.find((f) =>
                        f.canonical_title.toLowerCase().includes(name) ||
                        f.main_timeline.some((e) =>
                            e.title?.toLowerCase().includes(name) ||
                            e.title_romaji?.toLowerCase().includes(name)
                        )
                    );
                    if (match) {
                        console.log(`Found match for '${name}':`, match.canonical_title,
                            'Main:', match.main_timeline.length,
                            'Side Stories:', match.side_stories.length);
                    } else {
                        console.log(`No match found for '${name}'`);
                    }
                });

                const fateGroup = groups.find((f) =>
                    f.canonical_title.toLowerCase().includes('fate') ||
                    f.main_timeline.some((e) =>
                        e.title?.toLowerCase().includes('fate') ||
                        e.title_romaji?.toLowerCase().includes('fate')
                    )
                );
                console.log('Fate group title:', fateGroup?.canonical_title);
                console.log(
                    'Fate total entries:',
                    (fateGroup?.main_timeline.length ?? 0) + (fateGroup?.side_stories.length ?? 0)
                );
            }
        } catch (e) { }
    }
}
run();