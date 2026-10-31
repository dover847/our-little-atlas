import json
cats={
'Mind Experiments':'''The Abstract Word Experiment|Choose a word like freedom, home, intimacy or infinity. Define it independently, then compare.
The Interpretation Mirror|Write an ambiguous sentence; the other offers three interpretations before the intended meaning is revealed.
The Prediction Laboratory|Predict each other's answer to a question, then reveal and discuss surprises.
The Impossible Question|Invent a philosophical dilemma; defend opposing positions, then switch sides.
The Proposition Revision|Make a bold claim, find an exception, and rewrite it more precisely together.
The Consciousness Exchange|Describe an ordinary experience from inside your mind, including sensations and interpretations.
The Recognition Challenge|Each describe five patterns you notice in the other; confirm, correct or complicate them.
The Belief Laboratory|Construct the strongest argument against a belief you hold, then see what changes.
The Alternate Self|Imagine who you might have become under a different life circumstance.
The Question Behind the Question|Ask an ordinary question and explore what deeper question it contains.''',
'Writing & Creation':'''The Two-Mind Story|Alternate three sentences each, without controlling the other's plot decisions.
The Parallel Poems|Write poems independently using the same title; compare imagery and meaning.
The Impossible Civilization|Invent a country with its own laws, customs, myths and holidays.
The Private Dictionary|Invent words for experiences ordinary language cannot quite describe.
The Bilingual Poetry Exchange|Translate a short passage and compare what survives or changes.
The Future Museum|Create labels for imaginary exhibits from a shared future.
The Two-Person Novel|Take turns writing and editing one short chapter each week.
The Secret Character|Invent two characters and put them in one shared story.
The Alternate Ending|One writes a scene; the other creates two unexpected endings.
The Emotional Postcard|Describe your day as a landscape, weather pattern or fictional postcard.''',
'Two Places, One Moment':'''The Synchronized Café|Visit cafés at an agreed time and share the sights, drinks and conversation.
The Same-Moment Photograph|At an agreed time, each take a photo and interpret the other's image.
The Parallel Cooking Challenge|Cook versions of the same dish or ingredient and compare.
The Sunset Exchange|Watch the sky on the same day and exchange a photograph or description.
The Live Walk|Take walks while calling or sending voice notes; share one discovery.
The Virtual Museum|Explore an online museum together; select three works each.
The Bookstore Expedition|Find books you would choose for each other and explain why.
The One-Object Treasure Hunt|Choose a theme and find three examples around you.
The Same Recipe, Different Hands|Follow identical instructions and compare your personal touches.
The Ordinary Day Documentary|Record five little moments from your day as a visual diary.''',
'Games & Nonsense':'''The Terrible Art Competition|Draw the same absurd subject in five minutes; the worse the better.
The Five-Second Choice|Ask unusual either-or questions and answer instantly.
The One-Sentence Laugh Challenge|Try to make each other laugh using only one sentence.
The Secret Prediction Game|Guess how the other would react to unlikely situations.
Online Chess|Play a casual match and discuss your thinking afterward.
GeoGuessr Adventure|Explore unfamiliar places and compare geography clues.
Codenames Duet|Work together to identify words from limited clues.
Online Escape Room|Solve a virtual mystery by combining clues.
Karaoke Exchange|Choose surprise songs and share short recordings.
The Secret Language|Invent codes, symbols or phrases understood by only you two.
The Mystery Envelope|Prepare three clues leading to a surprise answer.
The Imaginary Courtroom|Put an absurd proposition on trial and argue both sides.''',
'Closeness & Affection':'''The Invisible Gift|Describe a gift that cannot be purchased: an experience or impossible moment.
The Three Truths|Share one joy, one challenge and one thing you look forward to.
The Quiet Call|Stay on a call while doing your own activities, without needing constant conversation.
The Unsent Letter|Write a letter you may choose to exchange, without any obligation.
The Emotional Weather Report|Describe your feelings as weather, seasons or landscapes.
The Appreciation Exchange|Share one small thing you genuinely appreciated recently.
The Memory Interpretation|Describe the same shared moment independently, then compare.
The Comfort Menu|List what helps when tired, stressed, excited or quiet.
The Twenty-Four Registers|Explore different forms of affection and what each means to you.
The Voluntary Closeness Check-In|Discuss what feels good and what small gesture would be welcome.''',
'Music, Art & Culture':'''The Emotional Soundtrack|Exchange a song and guess why it was chosen.
The Shared Playlist|Build a playlist alternating songs that tell a story.
The Film Night|Watch the same film or episode and compare reactions.
The Art Interpretation Duel|Interpret an artwork independently before reading about it.
The Cultural Exchange|Share a childhood reference, custom, food or tradition.
The Photograph Exhibition|Curate five photos from your lives with exhibit titles.
The Sound of My Day|Record a daily sound and have the other guess its origin.
The Shared Reading Room|Read the same short text and compare interpretations.
The Soundtrack to a Memory|Choose music that would accompany a personal memory in a film.
The Creative Classroom|Take turns teaching each other something you enjoy.''',
'Growing Together':'''The 100 Discoveries Project|Collect a hundred things learned through shared experiments.
The One-Year Experiment|Create a monthly ritual and observe how answers change.
The Shared Time Capsule|Save questions, predictions and photos for a future date.
The Future Museum Archive|Keep adding imagined artifacts from possible futures.
The Reciprocal Classroom|Teach one another a small lesson each week.
The Question of the Week|Answer one question independently and compare at week's end.
The Anniversary Letters|Write letters for a one-year or ten-year anniversary.
The Shared Atlas|Map your imaginary places, favorite ideas and shared memories.
The Monthly Adventure|Alternate choosing one unusual shared activity each month.
The Little Book of Us|Collect favorite creative pieces, jokes and discoveries.'''
}
a=[]
for cat,block in cats.items():
 for line in block.splitlines():
  title,desc=line.split('|',1)
  a.append({'id':len(a)+1,'category':cat,'title':title,'description':desc})
assert len(a)==72,len(a)
with open('/mnt/data/our-little-atlas/activities.json','w') as f:json.dump(a,f,ensure_ascii=False,indent=2)
